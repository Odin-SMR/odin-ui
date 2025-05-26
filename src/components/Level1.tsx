import { useParams } from "react-router-dom";
import StackedBarPlot from "./StackedBarPlot";
import { useState } from "react";

export const Level1 = () => {
  const { year } = useParams<{ year: string }>();
  const [focusYear, setFocusYear] = useState<number | null>(
    year ? parseInt(year, 10) : null
  );
  const handleFocusYearUpdate = (year: number) => {
    setFocusYear(year);
  };
  return (
    <>
      {/* <DonutChart width={400} height={400} data={series} /> */}
      <StackedBarPlot updateYear={handleFocusYearUpdate} year={null} />
      {focusYear && <StackedBarPlot year={focusYear} />}
    </>
  );
};
