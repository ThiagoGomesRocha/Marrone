import { IconChevronDown } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import ToggleSwitch from 'components/ToggleSwitch';
import { getPlatformModifierKey } from 'utils/common/platform';

/**
 * Autocomplete tab content. Sibling of the Configuration tab inside
 * Preferences > AI.
 *
 *   - master AI off          → notice only; the whole card is hidden
 *   - no provider configured → notice in the card body, controls disabled
 *   - no enabled model       → notice in the card body, controls disabled
 *   - everything on          → fully interactive
 */

const TRIGGER_MODES = [
  {
    value: 'aggressive',
    label: 'PREFERENCES.AI.AGGRESSIVE_LABEL',
    description: 'PREFERENCES.AI.AGGRESSIVE_DESC'
  },
  {
    value: 'debounced',
    label: 'PREFERENCES.AI.DEBOUNCED_LABEL',
    description: 'PREFERENCES.AI.DEBOUNCED_DESC'
  },
  {
    value: 'manual',
    label: 'PREFERENCES.AI.MANUAL_LABEL',
    description: 'PREFERENCES.AI.MANUAL_DESC'
  }
];

const AutocompletePane = ({
  aiEnabled,
  enabled,
  model,
  triggerMode,
  availableModels,
  hasConfiguredProvider,
  onToggleEnabled,
  onChangeModel,
  onChangeTriggerMode
}) => {
  const { t } = useTranslation();

  if (!aiEnabled) {
    return (
      <div className="autocomplete-tab flex flex-col gap-3">
        <div className="ai-empty-notice px-3.5 py-3 text-xs">
          {t('PREFERENCES.AI.AUTOCOMPLETE_DISABLED_NOTICE')}
        </div>
      </div>
    );
  }

  const hasUsableModel = availableModels.length > 0;
  const isInteractive = enabled && hasUsableModel;
  const activeTrigger = TRIGGER_MODES.find((m) => m.value === (triggerMode || 'debounced'));

  // Surface the most actionable blocker first when the user can't actually
  // get suggestions yet.
  let blockerMessage = null;
  if (!hasConfiguredProvider) {
    blockerMessage = t('PREFERENCES.AI.BLOCKER_ADD_KEY');
  } else if (!hasUsableModel) {
    blockerMessage = t('PREFERENCES.AI.BLOCKER_NO_MODELS');
  }

  return (
    <div className="autocomplete-tab flex flex-col gap-3">
      <div className="autocomplete-card">
        <div className="autocomplete-header flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12.5px] font-semibold">{t('PREFERENCES.AI.INLINE_AUTOCOMPLETE')}</span>
            <span className="autocomplete-sub text-[11px]">
              {t('PREFERENCES.AI.AUTOCOMPLETE_SUB')}
            </span>
          </div>
          <ToggleSwitch
            size="xs"
            isOn={enabled}
            handleToggle={() => onToggleEnabled(!enabled)}
            data-testid="ai-autocomplete-enabled-toggle"
          />
        </div>
      </div>

      <div className={`autocomplete-card ${enabled ? '' : 'dimmed'}`}>
        {blockerMessage && (
          <div className="autocomplete-blocker px-3.5 py-3 text-[11px]">
            {blockerMessage}
          </div>
        )}

        <div className="autocomplete-row flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11.5px] font-medium">{t('PREFERENCES.AI.MODEL')}</span>
            <span className="autocomplete-sub text-[10.5px]">
              {hasUsableModel
                ? t('PREFERENCES.AI.MODEL_RECOMMENDED')
                : t('PREFERENCES.AI.MODEL_NOT_AVAILABLE')}
            </span>
          </div>
          <div className="model-select-wrap relative inline-flex items-center">
            <select
              className="model-select"
              value={model || ''}
              disabled={!isInteractive}
              onChange={(e) => onChangeModel(e.target.value)}
              aria-label={t('PREFERENCES.AI.AUTOCOMPLETE_MODEL_ARIA')}
              data-testid="ai-autocomplete-model-select"
            >
              <option value="">{t('PREFERENCES.AI.AUTO_FASTEST')}</option>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <IconChevronDown size={12} strokeWidth={1.75} className="model-select-chevron" />
          </div>
        </div>

        <div className="autocomplete-row flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11.5px] font-medium">{t('PREFERENCES.AI.TRIGGER')}</span>
            <span className="autocomplete-sub text-[10.5px]">
              {t(activeTrigger?.description, { modifier: getPlatformModifierKey() })}
            </span>
          </div>
          <div className="trigger-pills inline-flex" role="radiogroup" aria-label={t('PREFERENCES.AI.TRIGGER_MODE_ARIA')}>
            {TRIGGER_MODES.map((m) => {
              const isSelected = (triggerMode || 'debounced') === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`trigger-pill ${isSelected ? 'selected' : ''}`}
                  disabled={!isInteractive}
                  onClick={() => onChangeTriggerMode(m.value)}
                  data-testid={`ai-autocomplete-trigger-${m.value}`}
                >
                  {t(m.label)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="autocomplete-row px-3.5 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11.5px] font-medium">{t('PREFERENCES.AI.KEYMAP')}</span>
            <div className="autocomplete-keymap text-[10.5px]">
              <kbd>Tab</kbd> {t('PREFERENCES.AI.KEYMAP_ACCEPT')} · <kbd>{getPlatformModifierKey()}</kbd>+<kbd>→</kbd> {t('PREFERENCES.AI.KEYMAP_ACCEPT_WORD')} · <kbd>Esc</kbd> {t('PREFERENCES.AI.KEYMAP_DISMISS')} · <kbd>{getPlatformModifierKey()}</kbd>+<kbd>\</kbd> {t('PREFERENCES.AI.KEYMAP_TRIGGER')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutocompletePane;
