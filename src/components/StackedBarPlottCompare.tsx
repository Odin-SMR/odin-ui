import { useFrequencyModeData, type TimelineCount } from "../hooks/Level1Stats";
import { FrequencyTimelinePlot } from "./StackedBarPlot";

export type GroupedRow = { group: number } & Record<string, TimelineCount>;
type Props = { year: number | null; level2: GroupedRow[] };

export default function StackedBarPlotCompare({ year, level2 }: Props) {
  const { series, loading, error } = useFrequencyModeData(year);
  return <FrequencyTimelinePlot data={series} loading={loading} error={error} level2={level2} />;
}
