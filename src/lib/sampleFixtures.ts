export interface SampleFixtureInfo {
  id: 'synthetic_groups' | 'synthetic_correlation' | 'messy_example';
  fileName: string;
  label: string;
  badge: string;
  description: string;
  defaultObjective: string;
  rawCsv: string;
}

export const SAMPLE_FIXTURES: SampleFixtureInfo[] = [
  {
    id: 'synthetic_groups',
    fileName: 'synthetic_groups.csv',
    label: 'Two-Group Experiment (synthetic_groups.csv)',
    badge: 'Primary Demo (12 rows)',
    description:
      'Independent control (n=6) vs treatment (n=6) groups with a continuous response in arbitrary units.',
    defaultObjective:
      'Compare the response measurements between the control and treatment groups and create an appropriate scientific figure.',
    rawCsv: `sample_id,group,response,unit
SYN01,control,8.2,arbitrary units
SYN02,control,9.4,arbitrary units
SYN03,control,10.1,arbitrary units
SYN04,control,9.8,arbitrary units
SYN05,control,10.5,arbitrary units
SYN06,control,8.9,arbitrary units
SYN07,treatment,11.9,arbitrary units
SYN08,treatment,12.8,arbitrary units
SYN09,treatment,13.1,arbitrary units
SYN10,treatment,14.2,arbitrary units
SYN11,treatment,12.5,arbitrary units
SYN12,treatment,13.7,arbitrary units
`,
  },
  {
    id: 'synthetic_correlation',
    fileName: 'synthetic_correlation.csv',
    label: 'Numeric Correlation (synthetic_correlation.csv)',
    badge: 'Correlation (10 rows)',
    description:
      'Ten paired continuous exposure and response observations for testing Pearson correlation and scatterplots.',
    defaultObjective:
      'Examine the linear association between exposure and response measurements and plot the paired observations.',
    rawCsv: `sample_id,exposure,response
COR01,1,4.0
COR02,2,5.6
COR03,3,6.0
COR04,4,7.9
COR05,5,7.3
COR06,6,10.1
COR07,7,10.7
COR08,8,11.0
COR09,9,13.1
COR10,10,13.6
`,
  },
  {
    id: 'messy_example',
    fileName: 'messy_example.csv',
    label: 'Data Quality Edge Cases (messy_example.csv)',
    badge: 'Guardrail Test (7 rows)',
    description:
      'Synthetic messy dataset with whitespace/case mismatches, missing and non-numeric cells, duplicate rows, -999 sentinel, 3 categories, and unit conflicts.',
    defaultObjective:
      'Inspect data quality issues and generate descriptive summaries after explicit normalization.',
    rawCsv: `sample_id,group,response,unit
SYN01, control ,10.2,mg/L
SYN02,Control,,mg/L
SYN03,control,not available,mg/L
SYN04,treatment,15.1,mg/L
SYN04,treatment,15.1,mg/L
SYN05,treatment,-999,mg/L
SYN06,treated,16.3,unknown
`,
  },
];

export const SYNTHETIC_GROUPS_CSV = SAMPLE_FIXTURES[0].rawCsv;
export const SYNTHETIC_CORRELATION_CSV = SAMPLE_FIXTURES[1].rawCsv;
export const MESSY_EXAMPLE_CSV = SAMPLE_FIXTURES[2].rawCsv;

