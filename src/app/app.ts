import { Component, computed, inject, signal } from '@angular/core';
import { QuizDataService, QuizOption, QuizQuestion } from './quiz-data.service';

type QuizMode = 'practice' | 'exam';
type Screen = 'home' | 'quiz' | 'results';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly quizData = inject(QuizDataService);
  private readonly themeStorageKey = 'quizly-night-mode';

  protected readonly questions: QuizQuestion[] = [];
  protected readonly isNightMode = signal(this.readInitialThemePreference());
  protected readonly mode = signal<QuizMode>('practice');
  protected readonly screen = signal<Screen>('home');
  protected readonly currentIndex = signal(0);
  protected readonly selectedOptions = signal<number[][]>([]);
  protected readonly importMessage = signal('');
  protected readonly importError = signal('');
  protected readonly questionCount = signal(this.quizData.questions.length);
  protected readonly questionBankSize = signal(this.quizData.questions.length);
  private lastSessionQuestions: QuizQuestion[] = [];

  protected readonly currentQuestion = computed<QuizQuestion>(() => this.questions[this.currentIndex()]);
  protected readonly selectedOptionIndexes = computed(() => this.selectedOptions()[this.currentIndex()] ?? []);
  protected readonly answeredCount = computed(() => this.selectedOptions().filter((answer) => answer.length > 0).length);
  protected readonly progress = computed(() => (this.answeredCount() / this.questions.length) * 100);
  protected readonly score = computed(() => this.questions.filter((question, index) => {
    return this.isAnswerCorrect(question, this.selectedOptions()[index] ?? []);
  }).length);
  protected readonly incorrectAnswers = computed(() => this.questions
    .map((question, index) => ({ question, selectedIndexes: this.selectedOptions()[index] ?? [] }))
    .filter(({ question, selectedIndexes }) => !this.isAnswerCorrect(question, selectedIndexes)));
  protected readonly scorePercent = computed(() => Math.round((this.score() / this.questions.length) * 100));
  protected readonly passed = computed(() => this.scorePercent() >= 70);

  constructor() {
    this.applyTheme(this.isNightMode());
  }

  protected toggleNightMode(): void {
    const nextTheme = !this.isNightMode();
    this.isNightMode.set(nextTheme);
    this.applyTheme(nextTheme);

    try {
      localStorage.setItem(this.themeStorageKey, String(nextTheme));
    } catch {
      // Ignore localStorage failures and keep in-memory theme state.
    }
  }

  protected startQuiz(mode: QuizMode): void {
    const sessionQuestions = this.drawNewSessionQuestions();
    this.questions.splice(0, this.questions.length, ...sessionQuestions);
    this.lastSessionQuestions = sessionQuestions;
    this.mode.set(mode);
    this.currentIndex.set(0);
    this.selectedOptions.set(Array.from({ length: this.questions.length }, () => []));
    this.screen.set('quiz');
  }

  protected updateQuestionCount(event: Event): void {
    const count = Number((event.target as HTMLInputElement).value);
    this.questionCount.set(Math.min(Math.max(1, count || 1), this.quizData.questions.length));
  }

  protected loadQuestionFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.importMessage.set('');
    this.importError.set('');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = this.quizData.loadQuestions(JSON.parse(String(reader.result)));
        this.questionBankSize.set(count);
        this.questionCount.set(count);
        this.importMessage.set(`${file.name} loaded — ${count} question${count === 1 ? '' : 's'} ready.`);
      } catch (error) {
        this.importError.set(error instanceof Error ? error.message : 'Unable to read this question file.');
      }
      input.value = '';
    };
    reader.onerror = () => {
      this.importError.set('The selected file could not be read.');
      input.value = '';
    };
    reader.readAsText(file);
  }

  protected selectOption(optionIndex: number): void {
    this.selectedOptions.update((answers) => answers.map((answer, index) => {
      if (index !== this.currentIndex()) return answer;
      if (this.mode() === 'practice') return answer.includes(optionIndex) ? answer : [...answer, optionIndex];
      if (this.currentQuestion().type === 'single-select') return [optionIndex];
      return answer.includes(optionIndex) ? answer.filter((item) => item !== optionIndex) : [...answer, optionIndex];
    }));
  }

  protected optionState(option: QuizOption, optionIndex: number): 'correct' | 'incorrect' | 'selected' | '' {
    const selectedIndexes = this.selectedOptionIndexes();
    if (!selectedIndexes.includes(optionIndex)) return '';
    if (this.mode() === 'exam') return 'selected';
    return option.isCorrect ? 'correct' : 'incorrect';
  }

  protected previousQuestion(): void { this.currentIndex.update((index) => Math.max(0, index - 1)); }

  protected nextQuestion(): void {
    if (this.currentIndex() === this.questions.length - 1) {
      if (this.mode() === 'exam') this.finishExam();
      return;
    }
    this.currentIndex.update((index) => index + 1);
  }

  protected finishExam(): void { this.screen.set('results'); }
  protected goHome(): void { this.screen.set('home'); }

  protected correctOption(question: QuizQuestion): QuizOption {
    return question.options.find((option) => option.isCorrect)!;
  }

  protected selectedAnswerText(question: QuizQuestion, selectedIndexes: number[]): string {
    return selectedIndexes.length === 0 ? 'Not answered' : selectedIndexes.map((index) => question.options[index].text).join(', ');
  }

  protected correctAnswerText(question: QuizQuestion): string {
    return question.options.filter((option) => option.isCorrect).map((option) => option.text).join(', ');
  }

  protected correctExplanationText(question: QuizQuestion): string {
    return question.options.filter((option) => option.isCorrect).map((option) => `${option.text}: ${option.explanation}`).join(' ');
  }

  private drawNewSessionQuestions(): QuizQuestion[] {
    let sessionQuestions = this.quizData.getRandomQuestions(this.questionCount());
    const canChangeSession = this.questionBankSize() > this.questionCount() || this.questionCount() > 1;

    for (let attempt = 0; attempt < 10 && canChangeSession && this.matchesPreviousSession(sessionQuestions); attempt++) {
      sessionQuestions = this.quizData.getRandomQuestions(this.questionCount());
    }

    return sessionQuestions;
  }

  private matchesPreviousSession(sessionQuestions: QuizQuestion[]): boolean {
    if (sessionQuestions.length !== this.lastSessionQuestions.length) return false;

    if (this.questionBankSize() > this.questionCount()) {
      return sessionQuestions.every((question) => this.lastSessionQuestions.includes(question));
    }

    return sessionQuestions.every((question, index) => question === this.lastSessionQuestions[index]);
  }

  private isAnswerCorrect(question: QuizQuestion, selectedIndexes: number[]): boolean {
    const correctIndexes = question.options.flatMap((option, index) => option.isCorrect ? [index] : []);
    return selectedIndexes.length === correctIndexes.length && selectedIndexes.every((index) => correctIndexes.includes(index));
  }

  private readInitialThemePreference(): boolean {
    try {
      const savedTheme = localStorage.getItem(this.themeStorageKey);
      if (savedTheme !== null) return savedTheme === 'true';
    } catch {
      // Fall back to system preference when localStorage is unavailable.
    }

    return !!globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(isNightMode: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('night-mode', isNightMode);
  }
}
