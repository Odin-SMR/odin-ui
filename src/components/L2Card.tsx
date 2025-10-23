import MoreVertIcon from "@mui/icons-material/MoreVert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import type React from "react";
import { useState, type PropsWithChildren } from "react";
import type { z } from "zod";
import type { schemas } from "../odinApi/cloud_client";
type L2 = z.infer<typeof schemas.Product>;

type L2PlotProps = PropsWithChildren<{
  data: L2;
}>;

export const L2Card: React.FC<L2PlotProps> = ({ data, children }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const download = async () => {
    const jsonString = JSON.stringify(data.data, null, 2); // pretty-print with indentation
    const blob = new Blob([jsonString], { type: "application/json" });
    // const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.scanid}_${data.name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <CardHeader
        title={data.name}
        // subheader={"bajs"}
        action={
          <IconButton
            aria-controls="menu"
            aria-haspopup="true"
            onClick={handleOpen}
          >
            <MoreVertIcon />
          </IconButton>
        }
      ></CardHeader>
      <Menu
        id="menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={download}>Download as json</MenuItem>
      </Menu>
      <CardContent> {children}</CardContent>
      {/* <CardActions>
        <Button> test</Button>
      </CardActions> */}
    </Card>
  );
};
