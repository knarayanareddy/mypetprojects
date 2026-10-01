import { SCENARIOS_A } from './scenariosA';
import { SCENARIOS_B } from './scenariosB';
import type { Category, Scenario } from './dsl';

export const SCENARIOS: Scenario[] = [...SCENARIOS_A, ...SCENARIOS_B];
export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
export const CATEGORIES: Category[] = ['Assistive & Care', 'Lab & Industry', 'Creative & Fun', 'Bimanual', 'Field & Sustainability', 'Games & Social'];
export type { Scenario };
