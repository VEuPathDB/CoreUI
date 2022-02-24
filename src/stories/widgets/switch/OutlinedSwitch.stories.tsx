import { Story, Meta } from '@storybook/react/types-6-0';

import {
  OutlinedSwitch,
  SwitchVariantProps,
} from '../../../components/widgets/switch';
import UIThemeProvider from '../../../components/theming/UIThemeProvider';
import {
  blue,
  green,
  mutedGreen,
  mutedMagenta,
  orange,
  purple,
  teal,
} from '../../../definitions/colors';
import { useState } from 'react';

export default {
  title: 'Controls/Widgets/Switch/OutlinedSwitch',
  component: OutlinedSwitch,
} as Meta;

const Template: Story<SwitchVariantProps> = (args) => {
  const [selectedOption, setSelectedOption] = useState(args.selectedOption);

  return (
    <UIThemeProvider
      theme={{
        palette: {
          primary: { hue: orange, level: 600 },
          secondary: { hue: purple, level: 500 },
        },
      }}
    >
      <OutlinedSwitch
        {...args}
        selectedOption={selectedOption}
        onOptionChange={(selection) => setSelectedOption(selection)}
      />
    </UIThemeProvider>
  );
};

export const Default = Template.bind({});
Default.args = {
  options: [true, false],
  selectedOption: true,
} as SwitchVariantProps;

export const LeftLabel = Template.bind({});
LeftLabel.args = {
  ...Default.args,
  labels: {
    left: 'Barbarian Hordes',
  },
} as SwitchVariantProps;

export const RightLabel = Template.bind({});
RightLabel.args = {
  ...Default.args,
  labels: {
    right: 'Zombie Hordes',
  },
} as SwitchVariantProps;

export const BothLabels = Template.bind({});
BothLabels.args = {
  ...Default.args,
  labels: {
    left: 'Barbarian Hordes',
    right: 'Zombie Hordes',
  },
} as SwitchVariantProps;

export const ThemeApplied = Template.bind({});
ThemeApplied.args = {
  ...Default.args,
  labels: {
    left: 'Barbarian Hordes',
    right: 'Zombie Hordes',
  },
  themeRole: 'primary',
} as SwitchVariantProps;

export const StyleOverrides = Template.bind({});
StyleOverrides.args = {
  ...Default.args,
  labels: {
    left: 'Barbarian Hordes',
    right: 'Zombie Hordes',
  },
  styleOverrides: {
    default: [
      {
        backgroundColor: mutedMagenta[200],
        knobColor: mutedMagenta[500],
      },
      {
        backgroundColor: mutedGreen[200],
        knobColor: mutedGreen[500],
      },
    ],
    hover: [
      {
        backgroundColor: mutedMagenta[300],
        knobColor: mutedMagenta[100],
      },
      {
        backgroundColor: mutedGreen[300],
        knobColor: mutedGreen[100],
      },
    ],
  },
} as SwitchVariantProps;
