import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, Dialog, IconButton, Popover, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useId, useRef, useState, type ReactNode } from "react";

type Props = {
  label: string;
  buttonLabel?: ReactNode;
  title?: string;
  description?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  anchorEl?: Element | null;
  disabled?: boolean;
};

/** Extended chart information stays available by keyboard and touch, not just hover. */
export function InspectMenu({ label, buttonLabel, title = label, description, children, open: controlledOpen, onOpenChange, anchorEl, disabled }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => { setInternalOpen(next); onOpenChange?.(next); };
  const close = () => setOpen(false);
  const content = <Box sx={{ p: 2, minWidth: 0, overflowWrap: "anywhere" }}>
    <Stack direction="row" sx={{ gap: 1, alignItems: "center", justifyContent: "space-between", mb: 2 }}>
      <Typography id={`${id}-title`} component="h2" variant="h6">{title}</Typography>
      <IconButton aria-label={`Close ${label}`} onClick={close} sx={{ flexShrink: 0, minWidth: 44, minHeight: 44 }}><CloseIcon /></IconButton>
    </Stack>
    <Stack spacing={2}>{typeof children === "function" ? children(close) : children}</Stack>
  </Box>;
  return <>
    <Tooltip title={description ?? `Open ${label.toLowerCase()}`} describeChild disableTouchListener>
      <span><Button ref={button} aria-label={label} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(true)} sx={{ minHeight: 44, minWidth: buttonLabel ? 44 : undefined }}>{buttonLabel ?? label}</Button></span>
    </Tooltip>
    {phone ? <Dialog id={id} open={open} onClose={close} aria-labelledby={`${id}-title`} fullWidth maxWidth="sm"
      slotProps={{ container: { sx: { alignItems: "flex-end" } }, paper: { sx: { m: 0, width: "100%", maxWidth: "100%", maxHeight: "85dvh", borderRadius: "12px 12px 0 0" } } }}>{content}</Dialog>
      : <Popover open={open} anchorEl={anchorEl ?? button.current} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { id, role: "dialog", "aria-modal": true, "aria-labelledby": `${id}-title`, sx: { width: 420, maxWidth: "calc(100vw - 32px)", maxHeight: "min(80dvh, 700px)" } } }}>{content}</Popover>}
  </>;
}
