import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { DraggablePanel, DraggablePanelCoordinatePair } from "./DraggablePanel";

describe("Draggable Panels", () => {
  test("dragging a panel changes where it lives.", () => {
    const defaultPosition: DraggablePanelCoordinatePair = { x: 0, y: 0 };
    const panelTitleForAccessibilityOnly = "Study Filters Panel";
    const handleOnDragComplete = jest.fn();
    render(
      <DraggablePanel
        defaultPosition={defaultPosition}
        panelTitleForAccessibilityOnly={panelTitleForAccessibilityOnly}
        isOpen
        onDragComplete={handleOnDragComplete}
        onPanelDismiss={() => {}}
      >
        <p>Panel contents</p>
      </DraggablePanel>
    );
    const panelDragHandle = screen.getByText(
      `Close ${panelTitleForAccessibilityOnly}`
    );

    const destinationCoordinates = { clientX: 73, clientY: 22 };

    drag(panelDragHandle, destinationCoordinates);

    /**
     * I really don't like assert on implementation details. If we change React dragging librbaries,
     * this assertion could break and raise a false positive. That said, jsdom doesn't render layouts
     * like a legit browser so we're left with this and data-testids. The data-testid is nice because
     * at least we're in control of that so we can make sure that doesn't change if we swap dragging
     * providers. See conversations like: https://softwareengineering.stackexchange.com/questions/234024/unit-testing-behaviours-without-coupling-to-implementation-details
     */

    const panelFromDataTestId = screen.getByTestId(
      `${panelTitleForAccessibilityOnly} dragged`
    );
    expect(panelFromDataTestId.style.transform).toEqual(
      `translate(${destinationCoordinates.clientX}px,${destinationCoordinates.clientY}px)`
    );

    expect(panelFromDataTestId).toBeTruthy();
    expect(handleOnDragComplete).toHaveBeenCalled();
  });

  test("you can open and close panels", async () => {
    const defaultPosition = { x: 50, y: 50 };

    function ToggleButtonAndDraggablePanel() {
      const [panelIsOpen, setPanelIsOpen] = useState(true);
      return (
        <>
          <button onClick={() => setPanelIsOpen((isOpen) => !isOpen)}>
            Toggle Filters Panel
          </button>
          <DraggablePanel
            defaultPosition={defaultPosition}
            isOpen={panelIsOpen}
            panelTitleForAccessibilityOnly="My Filters"
            onDragComplete={() => {}}
            onPanelDismiss={() => setPanelIsOpen(false)}
          >
            <p>I might be here or I might be gone</p>
          </DraggablePanel>
        </>
      );
    }

    render(
      <>
        <ToggleButtonAndDraggablePanel />
        <DraggablePanel
          defaultPosition={defaultPosition}
          isOpen
          panelTitleForAccessibilityOnly="My Extra Ordinary Data"
          onDragComplete={() => {}}
          onPanelDismiss={() => {}}
        >
          <p>I will be with you forever.</p>
        </DraggablePanel>
      </>
    );

    expect(
      screen.getByText("I might be here or I might be gone")
    ).toBeVisible();

    const closePanel = screen.getByText("Close My Filters");
    fireEvent.click(closePanel);

    expect(
      screen.queryByText("I might be here or I might be gone")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("I will be with you forever.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Toggle Filters Panel"));
    expect(
      screen.getByText("I might be here or I might be gone")
    ).toBeInTheDocument();
  });
});

/**
 * So we're pretty limited as regards js-dom and dragging. Here's what I would like to do:
 * 1. Simulate dragging events on the draggable element.
 * 2. Find the element, getBoundingClientRect for the element
 * 3. Assert that the coordinates moved predictably.
 *
 * Here's the reality: jsdom doesn't do any rendering, so getBoundingClientRect() always
 * returns 0,0,0,0. That won't change (even foreseeable long-term).
 * You can try to mock the function to emulate the results you'd expect.
 * https://github.com/jsdom/jsdom/issues/1590#issuecomment-243228840
 *
 * @param element
 * @param destinationCoordinates
 */
function drag(
  element: HTMLElement,
  destinationCoordinates: { clientX: number; clientY: number }
): void {
  fireEvent.mouseDown(element);
  fireEvent.mouseMove(element, destinationCoordinates);
  fireEvent.mouseUp(element);
}
