import { createMemo } from 'solid-js';

import defaultTemplate from './weather-component.njk?raw';
import { createTemplateElement } from '~/shared/template-parsing';
import { WeatherComponentConfig } from '~/shared/user-config';
import {
  WeatherStatus,
  useWeatherProvider,
} from '~/shared/providers/use-weather-provider.hook';

export function WeatherComponent(props: { config: WeatherComponentConfig }) {
  const weatherProvider = useWeatherProvider(
    props.config.latitude,
    props.config.longitude,
  );

  const bindings = createMemo(() => {
    const weatherData = weatherProvider.data();

    return {
      variables: {
        celsius_temp: weatherData?.celsiusTemp ?? 0,
        fahrenheit_temp: weatherData?.fahrenheitTemp ?? 0,
        wind_speed: weatherData?.windSpeed ?? 0,
        weather_status: weatherData?.weatherStatus ?? WeatherStatus.CLEAR_DAY,
        WeatherStatus: WeatherStatus,
        root_props: `id="${props.config.id}" class="${props.config.class_name}"`,
      },
      slots: {
        default: props.config.slot,
      },
    };
  });

  return createTemplateElement({
    bindings,
    config: () => props.config,
    defaultTemplate: () => defaultTemplate,
  });
}