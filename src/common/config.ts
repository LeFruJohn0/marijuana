import type StaticConfig from '~/static/config.json';
import { LoadJsonFile } from 'utils';

let config = LoadJsonFile('static/config.json');

$BROWSER: {
  config = await config;
}

type SeedData = {
  receive: string;
  amount: { min: number; max: number };
  stages: Record<string, string | null>;
};

type ConfigType = Omit<typeof StaticConfig, 'Seeds'> & {
  Seeds: Record<string, SeedData>;
};

export default config as ConfigType;