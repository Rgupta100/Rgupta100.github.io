import '../styles/pc-project-panels.css';

/** Project workspaces reuse the portfolio's factual copy and illustrative diagrams. */
export function installProjectPanels() {
  const projects = [...document.querySelectorAll<HTMLElement>('#project-reading > .project')];
  if (!projects.length) return;
  const panel = document.createElement('dialog');
  panel.className = 'pc-project-panel'; panel.setAttribute('aria-labelledby', 'pc-panel-title');
  panel.innerHTML = `<header class="pc-panel-bar"><span>Project workspace</span><button type="button" class="pc-panel-close" aria-label="Close project workspace">Close <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></header><nav class="pc-panel-switcher" aria-label="Choose project"></nav><div class="pc-panel-content"><h2 id="pc-panel-title"></h2><div class="pc-panel-project"></div></div>`;
  document.body.append(panel);
  const title = panel.querySelector<HTMLElement>('#pc-panel-title')!;
  const content = panel.querySelector<HTMLElement>('.pc-panel-project')!;
  const switcher = panel.querySelector<HTMLElement>('.pc-panel-switcher')!;
  const close = panel.querySelector<HTMLButtonElement>('.pc-panel-close')!;
  let opener: HTMLButtonElement | undefined;
  const names = projects.map(project => {
    const heading = project.querySelector('h3')!.cloneNode(true) as HTMLElement;
    heading.querySelectorAll('br').forEach(br => br.replaceWith(' '));
    return heading.textContent!.trim();
  });
  function select(index: number) {
    title.textContent = names[index]; content.replaceChildren();
    for (const element of projects[index].querySelectorAll(':scope > p, :scope > .diagram, :scope > a.text-link')) {
      const copy = element.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[id]').forEach(item => item.removeAttribute('id'));
      content.append(copy);
    }
    for (const diagram of content.querySelectorAll<HTMLElement>('[data-diagram]')) {
      const buttons = [...diagram.querySelectorAll<HTMLButtonElement>('[data-step]')];
      const descriptions = [...diagram.querySelectorAll<HTMLElement>('[data-step-panel]')];
      const step = (value: string) => {
        diagram.dataset.activeStep = value;
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.step === value)));
        descriptions.forEach(description => { description.hidden = description.dataset.stepPanel !== value; });
      };
      buttons.forEach(button => button.addEventListener('click', () => step(button.dataset.step!)));
      step('0');
    }
    [...switcher.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    panel.querySelector('.pc-panel-content')!.scrollTop = 0;
  }
  projects.forEach((project, index) => {
    const tab = document.createElement('button'); tab.type = 'button'; tab.textContent = names[index];
    tab.addEventListener('click', () => select(index)); switcher.append(tab);
    const open = document.createElement('button'); open.type = 'button'; open.className = 'pc-project-open';
    open.textContent = 'Open project workspace'; open.setAttribute('aria-label', `Open ${names[index]} workspace`);
    open.setAttribute('aria-haspopup', 'dialog');
    open.addEventListener('click', () => { opener = open; select(index); panel.showModal(); document.documentElement.classList.add('pc-panel-open'); close.focus(); });
    project.append(open);
  });
  close.addEventListener('click', () => panel.close());
  panel.addEventListener('click', event => { if (event.target === panel) { const rect = panel.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) panel.close(); } });
  panel.addEventListener('close', () => { document.documentElement.classList.remove('pc-panel-open'); opener?.focus({preventScroll: true}); });
}
