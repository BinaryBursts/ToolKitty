/**
 * The shared UI kit.
 *
 * Every tool screen is assembled from these pieces rather than styled by hand,
 * so the four tools look like one family and the keyboard, focus and contrast
 * behaviour is fixed in one place (REQ-3). Each component maps onto classes
 * from the approved theme in `src/app/globals.css`; no component sets a colour
 * of its own, which is how light and dark stay correct everywhere.
 */

export {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from "./Button";
export {
  CopyButton,
  COPY_CONFIRMATION_MS,
  COPY_FAILURE_MESSAGE,
  type CopyButtonProps,
} from "./CopyButton";
export { Field, type FieldProps } from "./Field";
export {
  InlineMessage,
  type InlineMessageProps,
  type InlineMessageVariant,
} from "./InlineMessage";
export { Readout, type ReadoutProps } from "./Readout";
export { Select, type SelectProps } from "./Select";
export {
  SegmentedSelect,
  type SegmentedOption,
  type SegmentedSelectProps,
} from "./SegmentedSelect";
export { Slider, type SliderProps } from "./Slider";
export { SwapButton, type SwapButtonProps } from "./SwapButton";
export { Textarea, type TextareaProps } from "./Textarea";
export { TextInput, type TextInputProps } from "./TextInput";
export {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  SearchIcon,
  SwapIcon,
} from "./icons";
