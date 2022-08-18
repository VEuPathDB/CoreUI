import { useMemo } from "react";
import { merge } from "lodash";

// Definitions
import { SwitchStyleSpec, SwitchStyleSpecSubset, SwitchVariantProps } from ".";
import { blue, gray } from "../../../definitions/colors";

// Components
import Switch from "./Switch";
import { useUITheme } from "../../theming";

/** "Filled" style Switch component. */
export default function Toggle({
  label,
  labelPosition,
  themeRole,
  styleOverrides,
  state,
  onToggle,
  disabled,
  size = 'medium',
}: SwitchVariantProps) {
  const theme = useUITheme();

  const styleSpec: SwitchStyleSpec = useMemo(() => {
    const defaultStyleSpec: SwitchStyleSpec = {
      container: {},
      default: [
        {
          backgroundColor: blue[500],
          knobColor: "white",
          borderColor: undefined,
          labelColor: gray[600],
        },
      ],
      hover: [
        {
          backgroundColor: blue[600],
          knobColor: "white",
          borderColor: undefined,
          labelColor: gray[600],
        },
      ],
      disabled: {
        backgroundColor: gray[500],
        knobColor: "white",
        borderColor: undefined,
        labelColor: gray[600],
      },
    };

    const themeStyles: SwitchStyleSpecSubset | undefined = theme &&
      themeRole && {
        default: [
          {
            backgroundColor: theme?.palette[themeRole].hue[500],
            knobColor: theme?.palette[themeRole].hue[100],
          },
        ],
        hover: [
          {
            backgroundColor: theme?.palette[themeRole].hue[600],
            knobColor: theme?.palette[themeRole].hue[100],
          },
        ],
      };

    return merge({}, defaultStyleSpec, themeStyles, styleOverrides);
  }, [styleOverrides, theme, themeRole]);

  return (
    <Switch
      styleSpec={styleSpec}
      label={label}
      labelPosition={labelPosition}
      onToggle={onToggle}
      state={state}
      disabled={disabled}
      size={size}
    />
  );
}
