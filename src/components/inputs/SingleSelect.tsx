import { ReactNode, useEffect, useState, useRef } from "react";
import PopoverButton from "../buttons/PopoverButton/PopoverButton";
import { Item } from "./checkboxes/CheckboxList";
import { css } from '@emotion/react';
import { uniqueId } from "lodash";
  
export interface SingleSelectProps {
    items: Item[];
    value: string;
    onSelect: (value: string) => void;
    buttonDisplayContent: ReactNode;
}

export default function SingleSelect({
    items,
    value,
    onSelect,
    buttonDisplayContent,
}: SingleSelectProps) {
    const [ isPopoverOpen, setIsPopoverOpen ] = useState<boolean>(false);

    /** 
     * 1. Find the index of the value prop in the items array to set focused state in the dropdown 
     * 2. If a value is not found, defaults to the first item in the dropdown
    */
    const selectedValueIndex = items.findIndex(item => value === item.value);
    const defaultOrSelectedValueIndex = selectedValueIndex !== -1 ? selectedValueIndex : 0;
    const [ indexOfFocusedElement, setIndexOfFocusedElement ] = useState(defaultOrSelectedValueIndex);

    const [ key, setKey ] = useState<string>('');

    const handleSelection = (newValue: string) => {
        onSelect(newValue);
        setKey(uniqueId());
    }

    /** Update focused element when index of selected value changes */
    useEffect(() => {
        setIndexOfFocusedElement(defaultOrSelectedValueIndex)
    }, [defaultOrSelectedValueIndex])

    const onKeyDown = (key: string, newValue: string) => {
        if (!isPopoverOpen) return;
        if (key === 'Enter') {
            handleSelection(newValue)
        } else if (key === 'ArrowUp') {
            indexOfFocusedElement !== 0 ? setIndexOfFocusedElement(prev => prev - 1) : null;
        } else if (key === 'ArrowDown') {
            indexOfFocusedElement !== items.length - 1 ? setIndexOfFocusedElement(prev => prev + 1) : null;
        }
    }

    return (
        <PopoverButton
            key={key}
            buttonDisplayContent={buttonDisplayContent}
            setIsPopoverOpen={setIsPopoverOpen}
        >
            <ul
                aria-label={'Menu of selectable options'}
                role="listbox"
                css={{
                    padding: 0,
                    margin: 0,
                    minWidth: '200px',
                    listStyle: 'none',
                }}
            >
                {items.map((item, index) => (
                    <Option 
                        key={item.value}
                        item={item} 
                        onSelect={handleSelection} 
                        onKeyDown={onKeyDown} 
                        shouldFocus={
                            index === indexOfFocusedElement
                        }
                        isSelected={value === item.value}
                    />
                ))}
            </ul>
        </PopoverButton>
    )
}

interface OptionProps {
    item: Item;
    onSelect: (value: string) => void;
    onKeyDown: (key: string, value: string) => void;
    shouldFocus: boolean;
    isSelected: boolean;
}

function Option({
    item, 
    onSelect, 
    onKeyDown,
    shouldFocus,
    isSelected
}: OptionProps) {
    const optionRef = useRef<HTMLLIElement>(null);

    if (shouldFocus && optionRef.current) {
        optionRef.current.focus();
    }

    return (
        <li
            role="option"
            aria-selected={isSelected}
            ref={optionRef}
            key={item.value}
            css={css`
                padding: 0.5em;
                line-height: 1.25;
                cursor: pointer;
                &:focus {
                    background-color: #3375E1;
                    color: white;
                }
                &:hover {
                    background-color: #3375E1;
                    color: white;
                }
            `}
            tabIndex={-1}
            onClick={() => onSelect(item.value)} 
            onKeyDown={(e) => onKeyDown(e.key, item.value)}
        >
            {item.display}
        </li>
    )
}