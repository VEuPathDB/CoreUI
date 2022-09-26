import React from "react";
import { Story, Meta } from "@storybook/react/types-6-0";

import {
  IconProps,
  Arrow,
  CaretDown,
  CaretUp,
  DoubleArrow,
  Cancel,
} from "../../assets/icons";
import { gray } from "../../definitions/colors";
import { H5 } from "../../components/typography";

export default {
  title: "Typography/Icons",
  component: Arrow,
  argTypes: {
    color: {
      control: {
        type: "color",
      },
    },
  },
} as Meta;

const IconDisplay = ({
  name,
  component,
  ...args
}: IconProps & {
  name: string;
  component: (props: IconProps) => JSX.Element;
}) => {
  const Icon = component;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div>
        <Icon {...args} />
      </div>
      <div
        style={{ color: args.color, fontSize: 14, fontFamily: "sans-serif" }}
      >
        {name}
      </div>
    </div>
  );
};

export const AllIcons: Story<IconProps> = (args) => {
  return (
    <div>
      <H5>All Icons</H5>
      <hr />
      <br />
      <div style={{ display: "flex", gap: 20 }}>
        <IconDisplay {...args} name="Arrow" component={Arrow} />
        <IconDisplay {...args} name="CaretDown" component={CaretDown} />
        <IconDisplay {...args} name="CaretUp" component={CaretUp} />
        <IconDisplay {...args} name="DoubleArrow" component={DoubleArrow} />
        <IconDisplay {...args} name="Cancel" component={Cancel} />
      </div>
    </div>
  );
};
AllIcons.args = {
  width: 25,
  height: 25,
  color: gray[600],
  extraCSS: {},
};
