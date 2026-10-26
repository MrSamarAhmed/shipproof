import type {
  AppState,
  CheckDetail,
  Ledger,
  RequirementResult,
  Status,
} from './model';

export type BusyAction = 'sample' | 'import';

export interface ExportFeedback {
  readonly message: string;
  readonly error: boolean;
}

export interface DashboardOptions {
  readonly state: AppState;
  readonly ledger: Ledger;
  readonly error: string | null;
  readonly busyAction: BusyAction | null;
  readonly openMapperId: string | null;
  readonly exportFeedback: ExportFeedback | null;
  readonly projectName: string;
  readonly onLoadSample: () => void;
  readonly onImportFile: (file: File) => void;
  readonly onExport: () => void;
  readonly onToggleMapper: (requirementId: string) => void;
  readonly onAddMapping: (requirementId: string, testId: string) => void;
  readonly onRemoveMapping: (requirementId: string, testId: string) => void;
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
    buildHeader(
      options.state,
      options.busyAction,
      options.exportFeedback,
      options.projectName,
      options.onLoadSample,
      options.onImportFile,
      options.onExport,
    ),
    buildMain(options),
    buildFooter(),
  );
  root.append(shell);
}

function buildHeader(
  state: AppState,
  busyAction: BusyAction | null,
  exportFeedback: ExportFeedback | null,
  projectName: string,
  onLoadSample: () => void,
  onImportFile: (file: File) => void,
  onExport: () => void,
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

  const actions = element('div', { className: 'header-actions' });

  if (state.evidence === null) {
    const sampleButton = element('button', {
      className: 'button primary',
      text: busyAction === 'sample' ? 'Loading sample…' : 'Load sample evidence',
      attrs: { type: 'button' },
    });
    sampleButton.disabled = busyAction !== null;
    sampleButton.addEventListener('click', onLoadSample);
    actions.append(sampleButton);
  }

  const fileInput = element('input', {
    className: 'sr-only file-input',
    attrs: {
      type: 'file',
      accept: '.xml,application/xml,text/xml',
    },
  });
  fileInput.disabled = busyAction !== null;
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file !== undefined) {
      onImportFile(file);
    }
  });

  const fileLabel = element(
    'label',
    {
      className: `button secondary file-button${busyAction === 'import' ? ' is-busy' : ''}${busyAction !== null ? ' is-disabled' : ''}`,
      text: busyAction === 'import' ? 'Validating report…' : 'Import JUnit XML',
    },
    [fileInput],
  );
  if (busyAction !== null) {
    fileLabel.setAttribute('aria-disabled', 'true');
  }
  actions.append(fileLabel);

  const exportBlock = element('div', { className: 'export-block' });
  const exportDisabled = state.evidence === null || busyAction !== null;
  const exportButton = element('button', {
    className: 'button primary',
    text: 'Export readiness report (JSON)',
    attrs: {
      type: 'button',
      'data-focus-key': 'export-report',
    },
  });
  exportButton.disabled = exportDisabled;
  if (exportDisabled) {
    exportButton.setAttribute('aria-describedby', 'export-note');
  }
  exportButton.addEventListener('click', onExport);
  exportBlock.append(exportButton);

  let exportNote: string | null = null;
  if (state.evidence === null) {
    exportNote = 'Load evidence to enable the JSON export.';
  } else if (busyAction !== null) {
    exportNote = 'Export is unavailable while evidence is loading.';
  }
  if (exportNote !== null) {
    exportBlock.append(
      element('p', {
        className: 'export-note',
        text: exportNote,
        attrs: { id: 'export-note' },
      }),
    );
  }
  if (exportFeedback !== null) {
    exportBlock.append(
      element('p', {
        className: `export-feedback${exportFeedback.error ? ' is-error' : ' is-success'}`,
        text: exportFeedback.message,
      }),
    );
  }

  actions.append(exportBlock);
  header.append(actions);
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

function buildMain(options: DashboardOptions): HTMLElement {
  const { state, ledger, error, busyAction } = options;
  const main = element('main', { className: 'main' });
  const section = element('section', {
    className: 'panel ledger',
    attrs: {
      'aria-labelledby': 'ledger-heading',
      'aria-busy': busyAction !== null ? 'true' : 'false',
    },
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

  if (busyAction !== null) {
    section.append(
      element('p', {
        className: 'loading-note',
        text:
          busyAction === 'sample'
            ? 'Loading the bundled synthetic report…'
            : 'Reading and validating the selected JUnit XML report. The current evidence remains visible until the whole report is accepted.',
      }),
    );
  }

  if (error !== null) {
    section.append(
      element('div', { className: 'alert', attrs: { role: 'alert', tabindex: '-1' } }, [
        element('strong', { text: 'Error: ' }),
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

  section.append(buildSummary(ledger), buildRequirementList(options));
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

function buildRequirementList(options: DashboardOptions): HTMLElement {
  const list = element('ul', { className: 'requirement-list' });
  for (const result of options.ledger.requirements) {
    list.append(element('li', {}, [buildRequirement(options, result)]));
  }
  return list;
}

function buildRequirement(
  options: DashboardOptions,
  result: RequirementResult,
): HTMLElement {
  const { state } = options;
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
        text: 'No test result is shown because no evidence report is loaded. Test links can be managed after evidence loads.',
      }),
    );
  } else {
    article.append(buildMapper(options, result));
  }

  return article;
}

function buildMapper(
  options: DashboardOptions,
  result: RequirementResult,
): HTMLElement {
  const { state } = options;
  const isOpen = options.openMapperId === result.id;
  const mappingDisabled = options.busyAction !== null;
  const wrapper = element('div', { className: 'mapper' });

  const toggleAttrs: Record<string, string> = {
    type: 'button',
    'aria-expanded': isOpen ? 'true' : 'false',
    'data-focus-key': `mapper-toggle-${result.id}`,
  };
  if (isOpen) {
    toggleAttrs['aria-controls'] = `mapper-${result.id}`;
  }
  const toggle = element('button', {
    className: 'button secondary mapper-toggle',
    text: isOpen ? 'Hide test links' : 'Manage test links',
    attrs: toggleAttrs,
  });
  toggle.disabled = mappingDisabled;
  toggle.addEventListener('click', () => options.onToggleMapper(result.id));
  wrapper.append(toggle);

  if (!isOpen || state.evidence === null) {
    return wrapper;
  }

  const panel = element('div', {
    className: 'mapper-panel',
    attrs: {
      id: `mapper-${result.id}`,
      role: 'group',
      'aria-label': `Test links for ${result.id}`,
    },
  });

  if (mappingDisabled) {
    panel.append(
      element('p', {
        className: 'mapper-note warning',
        text: 'Mapping is unavailable while a report is being read.',
      }),
    );
  }

  panel.append(element('h3', { text: 'Current links' }));
  const checksById = new Map(result.checks.map((check) => [check.testId, check]));

  if (result.linkedTestIds.length === 0) {
    panel.append(element('p', { className: 'muted', text: 'No tests linked yet.' }));
  } else {
    const list = element('ul', { className: 'mapper-link-list' });
    for (const testId of result.linkedTestIds) {
      const check = checksById.get(testId);
      const outcome = check?.outcome ?? 'MISSING';
      const row = element('li', { className: 'mapper-link' });
      row.append(
        element('div', { className: 'mapper-link-row' }, [
          element('code', { className: 'mono', text: testId }),
          element('span', {
            className: `outcome outcome-${outcome.toLowerCase()}`,
            text: outcome,
          }),
        ]),
      );

      if (outcome === 'MISSING') {
        row.append(
          element('p', {
            className: 'mapper-note warning',
            text: 'Not found in the current report. The link is preserved until you remove it.',
          }),
        );
      }

      const shared = otherRequirementIds(state, result.id, testId);
      if (shared.length > 0) {
        row.append(
          element('p', {
            className: 'mapper-note',
            text: `Also linked to ${shared.join(', ')}.`,
          }),
        );
      }

      const remove = element('button', {
        className: 'button small danger',
        text: 'Remove link',
        attrs: {
          type: 'button',
          'data-focus-key': `mapper-remove-${result.id}`,
        },
      });
      remove.disabled = mappingDisabled;
      remove.setAttribute(
        'aria-label',
        `Remove link to ${testId} from ${result.id}`,
      );
      remove.addEventListener('click', () =>
        options.onRemoveMapping(result.id, testId),
      );
      row.append(remove);
      list.append(row);
    }
    panel.append(list);
  }

  panel.append(element('h3', { text: 'Add a link' }));
  const linked = new Set(result.linkedTestIds);
  const available = state.evidence.tests.filter((test) => !linked.has(test.id));
  const selectId = `mapper-select-${result.id}`;
  const fieldLabel = element('label', {
    className: 'field-label',
    text: `Test from the current report for ${result.id}`,
    attrs: { for: selectId },
  });
  const select = element('select', {
    className: 'select',
    attrs: {
      id: selectId,
      'data-focus-key': `mapper-select-${result.id}`,
    },
  });
  select.append(
    element('option', {
      text:
        available.length === 0
          ? 'All report tests are already linked'
          : 'Choose a test',
      attrs: { value: '' },
    }),
  );
  for (const test of available) {
    select.append(
      element('option', {
        text: `${test.id} — ${test.outcome}`,
        attrs: { value: test.id },
      }),
    );
  }
  select.disabled = mappingDisabled || available.length === 0;

  const addButton = element('button', {
    className: 'button primary',
    text: 'Add link',
    attrs: {
      type: 'button',
      'data-focus-key': `mapper-add-${result.id}`,
    },
  });
  addButton.disabled = true;
  select.addEventListener('change', () => {
    addButton.disabled = mappingDisabled || select.value === '';
  });
  addButton.addEventListener('click', () => {
    if (!mappingDisabled && select.value !== '') {
      options.onAddMapping(result.id, select.value);
    }
  });

  panel.append(
    fieldLabel,
    element('div', { className: 'mapper-add-row' }, [select, addButton]),
    element('p', {
      className: 'mapper-hint',
      text: 'Linking is a human assertion that the test is relevant. Statuses recompute immediately from the current report.',
    }),
  );
  wrapper.append(panel);
  return wrapper;
}

function otherRequirementIds(
  state: AppState,
  requirementId: string,
  testId: string,
): string[] {
  return state.mappings
    .filter(
      (mapping) =>
        mapping.testId === testId && mapping.requirementId !== requirementId,
    )
    .map((mapping) => mapping.requirementId);
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
