import { merge } from 'lodash';
import { CSSProperties, ReactNode, useEffect, useMemo, useState } from 'react';

import { UITheme, useUITheme } from '../theming';

import { H6 } from '../headers';
import { blue, gray } from '../../definitions/colors';
import { ChevronRight } from '../icons';

type PanelStateStyleSpec = {
  border: {
    width: number;
    color: CSSProperties['borderColor'];
    style: CSSProperties['borderStyle'];
    radius: CSSProperties['borderRadius'];
  };
  title: {
    textColor: CSSProperties['color'];
    iconColor: CSSProperties['color'];
  };
};

type ExpandablePanelStyleSpec = {
  container: CSSProperties;
  closed: PanelStateStyleSpec;
  focused: PanelStateStyleSpec;
  open: PanelStateStyleSpec & {
    content: {
      maxHeight?: CSSProperties['maxHeight'];
      divider: {
        color: CSSProperties['color'];
        thickness: number;
      };
    };
  };
};

export type ExpandablePanelProps = {
  title: string;
  content: ReactNode;
  state: 'closed' | 'open';

  /** Indicates which theme role to use for style augmentation. */
  themeRole?: keyof UITheme['palette'];
  /** Additional style specifications that will override defaults and theming. */
  styleOverrides?: Partial<ExpandablePanelStyleSpec>;
};

export default function ExpandablePanel({
  title,
  content,
  state,
  themeRole,
  styleOverrides,
}: ExpandablePanelProps) {
  const theme = useUITheme();

  const [hasFocus, setHasFocus] = useState(false);
  const [internalComponentState, setInternalComponentState] =
    useState<ExpandablePanelProps['state']>('closed');

  useEffect(() => {
    state !== internalComponentState && setInternalComponentState(state);
  }, [state]);

  const styleState = useMemo<'open' | 'focused' | 'closed'>(
    () =>
      internalComponentState === 'open'
        ? 'open'
        : hasFocus
        ? 'focused'
        : 'closed',
    [hasFocus, internalComponentState]
  );

  const componentStyle: ExpandablePanelStyleSpec = useMemo(() => {
    const defaultStyle: ExpandablePanelStyleSpec = {
      container: {},
      closed: {
        border: {
          width: 2,
          color: gray[300],
          style: 'solid',
          radius: 5,
        },
        title: {
          textColor: gray[500],
          iconColor: gray[500],
        },
      },
      focused: {
        border: {
          width: 2,
          color: gray[400],
          style: 'solid',
          radius: 5,
        },
        title: {
          textColor: gray[600],
          iconColor: gray[600],
        },
      },
      open: {
        border: {
          width: 2,
          color: gray[400],
          style: 'solid',
          radius: 5,
        },
        title: {
          textColor: gray[700],
          iconColor: gray[700],
        },
        content: {
          divider: {
            color: blue[500],
            thickness: 5,
          },
          maxHeight: undefined,
        },
      },
    };

    const themeStyle: Partial<ExpandablePanelStyleSpec> =
      theme && themeRole ? {} : {};

    return merge({}, defaultStyle, themeStyle, styleOverrides);
  }, [themeRole, styleOverrides, theme]);

  return (
    <div
      css={{
        outlineWidth: componentStyle[styleState].border.width,
        outlineColor: componentStyle[styleState].border.color,
        outlineStyle: componentStyle[styleState].border.style,
        borderRadius: componentStyle[styleState].border.radius,
        // outlineOffset: -1 * componentStyle[internalComponentState].border.width,
        transition: 'all .25s ease',
        ...componentStyle.container,
      }}
      onMouseOver={() => setHasFocus(true)}
      onMouseOut={() => setHasFocus(false)}
    >
      <div
        role='button'
        css={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
        }}
        onClick={() =>
          internalComponentState !== 'closed'
            ? setInternalComponentState('closed')
            : setInternalComponentState('open')
        }
      >
        <ChevronRight
          fontSize={24}
          css={{
            marginLeft: styleState === 'closed' ? 5 : 10,
            marginRight: styleState === 'open' ? 5 : 0,
            fill: componentStyle[styleState].title.iconColor,
            transition: 'all .25s ease',
            rotate: internalComponentState === 'open' ? '90deg' : 'none',
          }}
        />
        <H6
          text={title}
          additionalStyles={{ marginTop: 15, marginBottom: 15 }}
          color={componentStyle[styleState].title.textColor}
        />
      </div>
      <div
        css={{
          overflow: internalComponentState === 'open' ? 'initial' : 'hidden',
          height: internalComponentState === 'open' ? undefined : 0,
        }}
      >
        <div
          css={{
            backgroundColor: componentStyle['open'].content.divider.color,
            height: componentStyle['open'].content.divider.thickness,
          }}
        />
        <div
          css={{
            opacity: styleState === 'open' ? 1 : 0,
            transition: 'all .5s ease',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}