import { createMemo } from 'solid-js';

import { ComponentConfig, GroupConfig } from '~/shared/user-config';
import {
  createTemplateElement,
  glazewmWorkspacesTemplate,
  weatherTemplate,
} from '~/shared/templates';

export interface BarComponentProps {
  config: ComponentConfig;
  parentConfig: GroupConfig;
}

export function BarComponent(props: BarComponentProps) {
  const template = createMemo(() => {
    switch (props.config.template) {
      case 'template.glazewm_workspaces':
        return glazewmWorkspacesTemplate;
      case 'template.weather':
        return weatherTemplate;
      default:
        return props.config.template;
    }
  });

  // Get a map of slot bindings where the keys are slot names.
  // ie. 'slot' and 'slot/top' -> { default: '...', top: '...' }
  const slots = createMemo(() => {
    return Object.keys(props.config)
      .filter(key => key === 'slot' || key.startsWith('slot/'))
      .reduce((acc, key) => {
        const slotName = key.split('/')[1] ?? 'default';

        return {
          ...acc,
          [slotName]: props.config[key as 'slot' | `slot/${string}`],
        };
      }, {});
  });

  return createTemplateElement({
    id: props.config.id,
    className: props.config.class_name,
    template,
  });
}