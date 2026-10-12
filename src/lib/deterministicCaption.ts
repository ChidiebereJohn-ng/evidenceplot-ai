import type {
  ConfirmedDatasetConfig,
  FullAnalysisResult,
  InterpretationOutput,
} from './contracts';

function fmt(n: number | undefined, digits = 4): string {
  if (n === undefined || !Number.isFinite(n)) return 'N/A';
  if (Math.abs(n) > 0 && Math.abs(n) < 0.0001) {
    return n.toExponential(3);
  }
  return Number(n.toFixed(digits)).toString();
}

export function generateDeterministicInterpretation(
  result: FullAnalysisResult,
  confirmedConfig: ConfirmedDatasetConfig,
  fallbackReason?: string
): InterpretationOutput {
  const unit = confirmedConfig.unit || 'arbitrary units';
  const generated_at = new Date().toISOString();
  const prompt_version = 'ep-deterministic-v1.0';

  if (result.method === 'welch_t' && !result.blocked) {
    const groupA = result.comparisonOrder?.groupA ?? 'Group A';
    const groupB = result.comparisonOrder?.groupB ?? 'Group B';
    const nA = result.numbers.n_a;
    const nB = result.numbers.n_b;
    const meanA = result.numbers.mean_a;
    const meanB = result.numbers.mean_b;
    const sdA = result.numbers.sd_a;
    const sdB = result.numbers.sd_b;
    const diff = result.numbers.difference_b_minus_a;
    const ciLow = result.numbers.ci95_low;
    const ciHigh = result.numbers.ci95_high;
    const tStat = result.numbers.t_b_minus_a;
    const df = result.numbers.df;
    const pVal = result.numbers.p_two_sided;

    const sigPhrase =
      pVal < 0.05
        ? 'a statistically significant difference between group means'
        : 'no statistically significant difference between group means at α = 0.05';

    return {
      headline: `Welch two-group comparison (${groupB} vs ${groupA}): Δ = ${fmt(
        diff,
        3
      )} ${unit} (p = ${fmt(pVal, 5)})`,
      summary: `In an independent two-group Welch's t-test comparing ${groupB} (n = ${nB}, mean = ${fmt(
        meanB,
        3
      )} ${unit}, SD = ${fmt(sdB, 3)}) against ${groupA} (n = ${nA}, mean = ${fmt(
        meanA,
        3
      )} ${unit}, SD = ${fmt(
        sdA,
        3
      )}), the mean difference (${groupB} minus ${groupA}) was ${fmt(
        diff,
        4
      )} ${unit} (95% CI [${fmt(ciLow, 4)}, ${fmt(
        ciHigh,
        4
      )}], t = ${fmt(tStat, 4)}, df = ${fmt(df, 3)}, two-sided p = ${fmt(
        pVal,
        6
      )}), indicating ${sigPhrase}.`,
      figure_caption: `Figure: Individual observations (n = ${
        result.n_total
      } total; ${groupA} n = ${nA}, ${groupB} n = ${nB}) with group means and 95% confidence intervals (${unit}). Two-sided Welch's t-test (${groupB} minus ${groupA}): Δ = ${fmt(
        diff,
        3
      )} ${unit}, 95% CI [${fmt(ciLow, 3)}, ${fmt(ciHigh, 3)}], t(${fmt(
        df,
        2
      )}) = ${fmt(tStat, 3)}, p = ${fmt(pVal, 5)}.`,
      limitations:
        result.limitations.length > 0
          ? result.limitations.slice(0, 8)
          : [
              'Welch two-sample t-test evaluates differences in sample means and does not by itself establish causal mechanism.',
            ],
      verified_claims: [
        { key: 'n_a', value: nA },
        { key: 'n_b', value: nB },
        { key: 'mean_a', value: meanA },
        { key: 'mean_b', value: meanB },
        { key: 'difference_b_minus_a', value: diff },
        { key: 't_b_minus_a', value: tStat },
        { key: 'df', value: df },
        { key: 'p_two_sided', value: pVal },
        { key: 'ci95_low', value: ciLow },
        { key: 'ci95_high', value: ciHigh },
      ],
      source: 'deterministic_template',
      prompt_version,
      generated_at,
      fallback_reason: fallbackReason,
    };
  }

  if (result.method === 'pearson' && !result.blocked) {
    const n = result.numbers.n;
    const r = result.numbers.r;
    const pVal = result.numbers.p_two_sided;
    const meanX = result.numbers.mean_x;
    const meanY = result.numbers.mean_y;
    const xName = confirmedConfig.xColumn || 'X';
    const yName = confirmedConfig.yColumn || confirmedConfig.valueColumn || 'Y';

    const direction = r >= 0 ? 'positive' : 'negative';
    return {
      headline: `Pearson correlation (${xName} vs ${yName}): r = ${fmt(
        r,
        4
      )} (n = ${n}, p = ${fmt(pVal, 5)})`,
      summary: `Across n = ${n} complete paired observations, Pearson correlation between ${xName} (mean = ${fmt(
        meanX,
        3
      )}) and ${yName} (mean = ${fmt(
        meanY,
        3
      )} ${unit}) showed a ${direction} linear association of r = ${fmt(
        r,
        4
      )} (two-sided p = ${fmt(
        pVal,
        6
      )}). This statistic quantifies sample linear association and does not establish causation.`,
      figure_caption: `Figure: Paired observations (n = ${n}) of ${yName} (${unit}) versus ${xName} with ordinary least-squares linear trend. Two-sided Pearson r = ${fmt(
        r,
        4
      )}, p = ${fmt(pVal, 5)}.`,
      limitations:
        result.limitations.length > 0
          ? result.limitations.slice(0, 8)
          : [
              'Pearson correlation measures linear association only and cannot establish causal direction.',
            ],
      verified_claims: [
        { key: 'n', value: n },
        { key: 'r', value: r },
        { key: 'p_two_sided', value: pVal },
        { key: 'mean_x', value: meanX },
        { key: 'mean_y', value: meanY },
      ],
      source: 'deterministic_template',
      prompt_version,
      generated_at,
      fallback_reason: fallbackReason,
    };
  }

  // Descriptive fallback
  const verifiedClaims = Object.entries(result.numbers)
    .slice(0, 12)
    .map(([key, value]) => ({ key, value }));

  const groupParts = result.groupSummaries.map(
    (g) =>
      `${g.group} (n = ${g.n_valid}, mean = ${fmt(
        g.mean ?? undefined,
        3
      )}, SD = ${fmt(g.sd ?? undefined, 3)}, median = ${fmt(
        g.median ?? undefined,
        3
      )})`
  );

  return {
    headline: `Descriptive summary across ${result.n_total} valid observations (${unit})`,
    summary: `Descriptive statistical summary for ${
      confirmedConfig.valueColumn || 'response'
    } (${unit}): ${
      groupParts.join('; ') || `${result.n_total} observations summarized`
    }. No formal hypothesis test p-value was computed.`,
    figure_caption: `Figure: All valid observations (n = ${result.n_total}) plotted in ${unit} with group descriptive markers.`,
    limitations:
      result.limitations.length > 0
        ? result.limitations.slice(0, 8)
        : [
            'Descriptive summary only; inferential hypothesis testing was not performed.',
          ],
    verified_claims: verifiedClaims,
    source: 'deterministic_template',
    prompt_version,
    generated_at,
    fallback_reason: fallbackReason,
  };
}
