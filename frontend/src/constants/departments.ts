export const DEPARTMENTS = [
  'CSE',
  'IT',
  'ECE',
  'EEE',
  'EIE',
  'MECH',
  'MCTS',
  'AUTO',
  'CIVIL',
  'CHEM',
  'FT',
  'AI&DS',
  'AI&ML',
  'CSD',
  'MCA',
  'MBA',
  'M.Tech',
  'M.Sc',
] as const;

export type Department = typeof DEPARTMENTS[number];
