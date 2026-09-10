import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the quiz home screen', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Study smarter');
  });

  it('should toggle night mode from the top bar button', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const shell = compiled.querySelector('.app-shell');
    const toggleButton = compiled.querySelector('.theme-toggle') as HTMLButtonElement;

    expect(shell?.classList.contains('night-mode')).toBeFalse();

    toggleButton.click();
    fixture.detectChanges();

    expect(shell?.classList.contains('night-mode')).toBeTrue();
  });
});
