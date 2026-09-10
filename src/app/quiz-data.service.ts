import { Injectable } from '@angular/core';

export interface QuizOption {
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizQuestion {
  question: string;
  type: 'single-select' | 'multi-select';
  options: QuizOption[];
}

/**
 * Replace `questions` with data loaded from a JSON file when your question dump
 * has been converted. Each item should use the `QuizQuestion` shape above.
 */
@Injectable({ providedIn: 'root' })
export class QuizDataService {
  readonly questions: QuizQuestion[] = [
    {
      question: 'What color appears first in a rainbow?',
      type: 'single-select',
      options: [
        {
          text: 'Red',
          isCorrect: true,
          explanation: 'Correct — red appears on the outer edge and is traditionally listed first.',
        },
        {
          text: 'Black',
          isCorrect: false,
          explanation: 'Black is not one of the visible colors of a rainbow.',
        },
        {
          text: 'Green',
          isCorrect: false,
          explanation: 'Green is in the rainbow, but it follows red, orange, and yellow.',
        },
        {
          text: 'Violet',
          isCorrect: false,
          explanation: 'Violet appears at the inner edge of a rainbow, not first.',
        },
      ],
    },
    {
      question: 'Which part of the cell contains most genetic material?',
      type: 'single-select',
      options: [
        {
          text: 'Nucleus',
          isCorrect: true,
          explanation: 'Correct — in eukaryotic cells, most DNA is stored in the nucleus.',
        },
        {
          text: 'Cell membrane',
          isCorrect: false,
          explanation: 'The cell membrane controls what enters and leaves the cell.',
        },
        {
          text: 'Ribosome',
          isCorrect: false,
          explanation: 'Ribosomes synthesize proteins; they do not store most genetic material.',
        },
        {
          text: 'Cytoplasm',
          isCorrect: false,
          explanation: 'The cytoplasm contains organelles, but most DNA is kept in the nucleus.',
        },
      ],
    },
    {
      question: 'What is the value of $3^2 + 4^2$?',
      type: 'single-select',
      options: [
        {
          text: '25',
          isCorrect: true,
          explanation: 'Correct — $3^2 = 9$ and $4^2 = 16$, so the total is 25.',
        },
        {
          text: '7',
          isCorrect: false,
          explanation: 'This adds the bases rather than their squares.',
        },
        {
          text: '49',
          isCorrect: false,
          explanation: '49 is $7^2$, not $3^2 + 4^2$.',
        },
        {
          text: '12',
          isCorrect: false,
          explanation: '12 is the product of 3 and 4.',
        },
      ],
    },
    {
      question: 'Which of these are primary colors of light?',
      type: 'multi-select',
      options: [
        { text: 'Red', isCorrect: true, explanation: 'Red is a primary color of light.' },
        { text: 'Green', isCorrect: true, explanation: 'Green is a primary color of light.' },
        { text: 'Blue', isCorrect: true, explanation: 'Blue is a primary color of light.' },
        { text: 'Yellow', isCorrect: false, explanation: 'Yellow is produced by combining red and green light.' },
      ],
    },
  ];

  loadQuestions(data: unknown): number {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('The file must contain a non-empty array of questions.');
    }

    const questions = data.map((question, index) => this.validateQuestion(question, index));
    this.questions.splice(0, this.questions.length, ...questions);
    return questions.length;
  }

  getRandomQuestions(count: number): QuizQuestion[] {
    const shuffled = [...this.questions];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled
      .slice(0, Math.min(Math.max(1, count), shuffled.length))
      .map((question) => ({ ...question, options: this.shuffleOptions(question.options) }));
  }

  private shuffleOptions(options: QuizOption[]): QuizOption[] {
    const shuffled = [...options];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  private validateQuestion(value: unknown, index: number): QuizQuestion {
    const questionNumber = index + 1;
    if (!value || typeof value !== 'object') throw new Error(`Question ${questionNumber} must be an object.`);

    const question = value as Record<string, unknown>;
    if (typeof question['question'] !== 'string' || !question['question'].trim()) {
      throw new Error(`Question ${questionNumber} needs a question string.`);
    }
    if (question['type'] !== 'single-select' && question['type'] !== 'multi-select') {
      throw new Error(`Question ${questionNumber} must use type "single-select" or "multi-select".`);
    }
    if (!Array.isArray(question['options']) || question['options'].length < 2) {
      throw new Error(`Question ${questionNumber} needs at least two options.`);
    }

    const options = question['options'].map((option, optionIndex) => {
      if (!option || typeof option !== 'object') throw new Error(`Option ${optionIndex + 1} in question ${questionNumber} must be an object.`);
      const item = option as Record<string, unknown>;
      if (typeof item['text'] !== 'string' || typeof item['isCorrect'] !== 'boolean' || typeof item['explanation'] !== 'string') {
        throw new Error(`Option ${optionIndex + 1} in question ${questionNumber} needs text, isCorrect, and explanation.`);
      }
      return { text: item['text'], isCorrect: item['isCorrect'], explanation: item['explanation'] };
    });

    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount === 0 || (question['type'] === 'single-select' && correctCount !== 1)) {
      throw new Error(`Question ${questionNumber} must have one correct option for single-select, or at least one for multi-select.`);
    }

    return { question: question['question'], type: question['type'], options };
  }
}
