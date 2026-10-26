import type {
  AppState,
  CheckDetail,
  Ledger,
  RequirementResult,
  Status,
} from './model';

export interface DashboardOptions {
  readonly state: AppState;
  readonly ledger: Ledger;
  readonly error: string | null;
  readonly busy: boolean;
  readonly projectName: string;
  readonly onLoadSample: () => void;
}

interface ElementOptions {
  readonly className?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
}

export function renderDashboard(root: HTMLElement, options: DashboardOptions): void {
  root.replaceChildren();

  const shell = element('div', { className: 'shell' });
  shell.append(
    buildHeader(options.state, options.busy, options.projectName, options.onLoadSample),
    buildMain(options.state, options.ledger, options.error),
    buildFooter(),
  );
  root.append(shell);
}

function buildHeader(
  state: AppState,
  busy: boolean,
  projectName: string,
  onLoadSample: () => void,
): HTMLElement {
  const header = element('header', { className: 'site-header' });
  const brand = element('div', { className: 'brand' }, [
    element('span', { className: 'wordmark', text: 'ShipProof' }),
    element('span', { className: 'tagline', text: 'Proof Before Done' }),
  ]);
  const project = element('div', { className: 'project-block' }, [
    element('p', { className: 'eyebrow', text: 'Sample project' }),
    element('p', { className: 'project-name', text: projectName }),
  ]);

  header.append(brand, project, buildSource(state));

  if (state.evidence === null) {
    const actions = element('div', { className: 'header-actions' });
    const button = element('button', {
      className: 'button primary',
      text: busy ? 'Loading sample…' : 'Load sample evidence',
      attrs: { type: 'button' },
    });
    button.disabled = busy;
    button.addEventListener('click', onLoadSample);
    actions.append(button);
    header.append(actions);
  }

  return header;
}

function buildSource(state: AppState): HTMLElement {
  const block = element('div', { className: 'source-block' });
  block.append(element('p', { className: 'eyebrow', text: 'Evidence source' }));

  if (state.evidence === null) {
    block.append(element('p', { className: 'source-value', text: 'No evidence loaded' }));
    return block;
  }

  const { source } = state.evidence;
  let label = 'Imported evidence';
  if (source.kind === 'synthetic-sample') {
    label = 'Synthetic sample evidence — not a real test run';
  } else if (source.synthetic === true) {
    label = 'Imported evidence — declared synthetic, not a real test run';
  }

  block.append(
    element('p', {
      className: `source-value${source.synthetic === true ? ' source-synthetic' : ''}`,
      text: label,
    }),
    element('p', { className: 'source-file mono', text: source.filename }),
  );
  return block;
}

function buildMain(state: AppState, ledger: Ledger, error: string | null): HTMLElement {
  const main = element('main', { className: 'main' });
  const section = element('section', {
    className: 'panel ledger',
    attrs: { 'aria-labelledby': 'ledger-heading' },
  });

  const heading = element('div', { className: 'panel-heading' }, [
    element('h1', {
      text: 'Readiness ledger',
      attrs: { id: 'ledger-heading', tabindex: '-1' },
    }),
    element('p', {
      className: 'panel-note',
      text: 'Every status below comes from one deterministic rule: all linked checks must pass.',
    }),
  ]);
  section.append(heading);

  if (error !== null) {
    section.append(
      element('div', { className: 'alert', attrs: { role: 'alert' } }, [
        element('strong', { text: 'Import error: ' }),
        error,
      ]),
    );
  }

  if (state.evidence === null) {
    section.append(
      element('p', {
        className: 'empty-message',
        text: 'No evidence loaded yet. ShipProof cannot verify completion claims without supporting test results.',
      }),
    );
  }

  section.append(buildSummary(ledger), buildRequirementList(state, ledger));
  main.append(section);
  return main;
}

function buildSummary(ledger: Ledger): HTMLElement {
  const section = element('section', {
    className: 'summary',
    attrs: { 'aria-labelledby': 'summary-heading' },
  });
  section.append(
    element('h2', {
      className: 'summary-heading',
      text: 'Readiness summary',
      attrs: { id: 'summary-heading' },
    }),
  );

  const counts = element('dl', {
    className: 'counts',
    attrs: { 'aria-label': 'Requirement status counts' },
  });
  const counters: readonly [Status, number][] = [
    ['VERIFIED', ledger.summary.verified],
    ['FAILED', ledger.summary.failed],
    ['UNVERIFIED', ledger.summary.unverified],
  ];
  for (const [status, value] of counters) {
    counts.append(
      element('div', { className: `count count-${status.toLowerCase()}` }, [
        element('dt', { text: status }),
        element('dd', { text: String(value) }),
      ]),
    );
  }
  section.append(counts);

  section.append(
    element('p', {
      className: 'count-total',
      text: `Total requirements: ${ledger.summary.totalRequirements}`,
    }),
    element('p', {
      className: 'readiness-statement',
      text: ledger.summary.readinessStatement,
    }),
  );

  return section;
}

function buildRequirementList(state: AppState, ledger: Ledger): HTMLElement {
  const list = element('ul', { className: 'requirement-list' });
  for (const result of ledger.requirements) {
    list.append(element('li', {}, [buildRequirement(state, result)]));
  }
  return list;
}

function buildRequirement(state: AppState, result: RequirementResult): HTMLElement {
  const article = element('article', {
    className: `requirement requirement-${result.status.toLowerCase()}`,
    attrs: { 'aria-labelledby': `req-${result.id}-title` },
  });

  const head = element('div', { className: 'requirement-head' }, [
    element('div', { className: 'requirement-title' }, [
      element('p', { className: 'requirement-id mono', text: result.id }),
      element('h2', {
        text: result.title,
        attrs: { id: `req-${result.id}-title` },
      }),
    ]),
    element('span', {
      className: `status status-${result.status.toLowerCase()}`,
      text: result.status,
    }),
  ]);

  const evidence = element('div', { className: 'requirement-evidence' });
  evidence.append(element('h3', { text: 'Linked checks' }));

  if (result.checks.length > 0) {
    const checks = element('ul', { className: 'check-list' });
    for (const check of result.checks) {
      checks.append(buildCheck(check));
    }
    evidence.append(checks);
  } else if (result.linkedTestIds.length > 0) {
    const line = element('p', { className: 'muted' });
    line.append(document.createTextNode('Linked test IDs (not evaluated yet): '));
    result.linkedTestIds.forEach((testId, index) => {
      if (index > 0) line.append(document.createTextNode(', '));
      line.append(element('code', { className: 'mono', text: testId }));
    });
    evidence.append(line);
  } else {
    evidence.append(
      element('p', { className: 'muted', text: 'No linked test evidence.' }),
    );
  }

  const visibleGaps = result.gaps.filter((gap) => gap.testId !== null);
  if (visibleGaps.length > 0) {
    const gaps = element('div', { className: 'gap-block' });
    gaps.append(element('h3', { text: 'Evidence gaps' }));
    const gapList = element('ul', { className: 'gap-list' });
    for (const gap of visibleGaps) {
      gapList.append(
        element('li', { className: `gap gap-${gap.kind.toLowerCase()}` }, [
          element('span', { className: 'gap-kind', text: gap.kind }),
          element('code', { className: 'mono gap-id', text: gap.testId ?? '' }),
          element('p', { className: 'gap-message', text: gap.message }),
        ]),
      );
    }
    gaps.append(gapList);
    evidence.append(gaps);
  }

  article.append(
    head,
    element('p', { className: 'requirement-explanation', text: result.explanation }),
    evidence,
  );

  if (state.evidence === null) {
    article.append(
      element('p', {
        className: 'requirement-note',
        text: 'No test result is shown because no evidence report is loaded.',
      }),
    );
  }

  return article;
}

function buildCheck(check: CheckDetail): HTMLElement {
  const item = element('li', { className: 'check' });
  item.append(
    element('div', { className: 'check-row' }, [
      element('code', { className: 'mono check-id', text: check.testId }),
      element('span', {
        className: `outcome outcome-${check.outcome.toLowerCase()}`,
        text: check.outcome,
      }),
    ]),
  );

  if (check.outcome !== 'PASS') {
    item.append(
      element('p', { className: 'check-kind', text: outcomeLabel(check.outcome) }),
    );
  }
  if (check.message !== null) {
    item.append(element('p', { className: 'message', text: check.message }));
  }
  return item;
}

function outcomeLabel(outcome: CheckDetail['outcome']): string {
  switch (outcome) {
    case 'FAIL':
      return 'Assertion failure';
    case 'ERROR':
      return 'Execution error';
    case 'SKIPPED':
      return 'Skipped test';
    case 'MISSING':
      return 'Missing test';
    case 'PASS':
      return 'Passing test';
  }
}

function buildFooter(): HTMLElement {
  const footer = element('footer', { className: 'site-footer' });
  footer.append(
    element('p', {
      text: 'VERIFIED means the linked checks passed. It does not prove the application is correct, complete, or based on current evidence.',
    }),
    element('p', {
      text: 'Session only: evidence and mappings stay in this browser tab. ShipProof never runs tests or uploads files.',
    }),
  );
  return footer;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) {
    node.className = options.className;
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  if (options.attrs !== undefined) {
    for (const [name, value] of Object.entries(options.attrs)) {
      node.setAttribute(name, value);
    }
  }
  node.append(...children);
  return node;
}
