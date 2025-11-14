import Grid from "@mui/material/Grid";
import { loadLocalNews } from "../content/loadLocalNews";
import { NewsList } from "./newList";

const items = loadLocalNews();
export function News() {
  return (
    <Grid container maxWidth="lg" padding={2} spacing={2} sx={{justifyItems: "center"}}>
      <NewsList items={items} />
    </Grid>
  );
}
