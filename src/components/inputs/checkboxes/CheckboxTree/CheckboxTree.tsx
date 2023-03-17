import React, { useCallback, MouseEventHandler, useMemo, useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { merge } from 'lodash';

import CheckboxTreeNode, { CustomCheckboxes, CheckboxTreeNodeStyleSpec, defaultTreeNodeStyleSpec } from './CheckboxTreeNode';
import SearchBox, { SearchBoxStyleSpec } from '../../SearchBox/SearchBox';
import { Warning } from '../../../icons';

import { addOrRemove } from '../../SelectTree/Utils';
import { isLeaf, getLeaves, getBranches, mapStructure } from '../../SelectTree/Utils';
import { parseSearchQueryString } from '../../SelectTree/Utils';
import { Seq } from '../../SelectTree/Utils';

const NODE_STATE_PROPERTY = '__expandableTreeState';
const NODE_CHILDREN_PROPERTY = '__expandableTreeChildren';

export enum LinksPosition {
  None,
  Top = 1 << 1,
  Bottom = 1 << 2,
  Both = Top | Bottom
}

export type TreeLinksStyleSpec = {
  container?: React.CSSProperties;
  links?: React.CSSProperties;
  actionsContainerStyle?: React.CSSProperties
};

const defaultTreeLinksStyleSpec: TreeLinksStyleSpec = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      height: 'auto',
      flexWrap: 'wrap',
      padding: '0.5em 0',
      rowGap: '0.5em',
    },
    links: {
      fontSize: '0.9em',
      border: 0,
      background: 0,
      color: '#069',
      textDecoration: 'default',
      padding: 0,
      margin: 0,
    },
    actionsContainerStyle: {
      flexGrow: 1,
    }
};

const linksHoverDecoration = css({
  textDecoration: 'underline',
  cursor: 'pointer',
  background: 'none',
})

export type CheckboxTreeStyleSpec = {
  treeLinks?: TreeLinksStyleSpec;
  searchAndFilterWrapper?: React.CSSProperties;
  searchBox?: SearchBoxStyleSpec;
  additionalFilters?: {
    container?: React.CSSProperties;
  };
  treeNode?: CheckboxTreeNodeStyleSpec;
  treeSection?: {
    container?: React.CSSProperties;
    ul?: React.CSSProperties;
  }
}

const defaultCheckboxTreeStyleSpec: CheckboxTreeStyleSpec = {
  treeLinks: defaultTreeLinksStyleSpec,
  searchAndFilterWrapper: {
    display: 'flex',
    justifyContent: 'center',
  },
  searchBox: {},
  additionalFilters: {
    container: {
      display: 'flex',
      alignItems: 'center',
    },
  },
  treeSection: {
    container: {
      flexGrow: 2, 
      overflowY: 'auto',
      margin: '0.5em 0', 
    },
    ul: {
      width: '100%',
      margin: 0,
      padding: '0 1em', 
    }
  },
  treeNode: defaultTreeNodeStyleSpec,
}

type StatefulNode<T> = T & {
  __expandableTreeState: {
    isSelected: boolean,
    isVisible: boolean,
    isIndeterminate?: boolean,
    isExpanded?: boolean
  };
  __expandableTreeChildren: StatefulNode<T>[];
};

const Bar = () => <span> | </span>;

type ChangeHandler = (ids: string[]) => void;

export type CheckboxTreeProps<T> = {

  //%%%%%%%%%%% Basic expandable tree props %%%%%%%%%%%

  /** Node representing root of the data to be rendered as an expandable tree */
  tree: T;

  /** Takes a node, returns unique ID for this node; ID is used as input value of the nodes checkbox if using selectability */
  getNodeId: (node: T) => string;

  /** Takes a node, called during rendering to provide the children for the current node */
  getNodeChildren:  (node: T) => T[];

  /** Called when the set of expanded (branch) nodes changes.  The function will be called with the array of the expanded node ids.  If omitted, no handler is called. */
  onExpansionChange: ChangeHandler;

  /** Whether to, on expanding a node, automatically expand its descendants with one child */
  shouldExpandDescendantsWithOneChild?: boolean;

  /** Whether to expand a node if its contents are clicked */
  shouldExpandOnClick?: boolean

  /** Whether to show the root node or start with the array of children; optional, defaults to false */
  showRoot?: boolean;

  /** Called during rendering to create the react element holding the display name and tooltip for the current node, defaults to <span>{this.props.getNodeId(node)</span> */
  renderNode?: (node: T, path?: number[]) => React.ReactNode;

  /** List of expanded nodes as represented by their ids, default to null; if null, expandedList will be generated by the expandable tree. */
  expandedList: string[];

  //%%%%%%%%%%% Properties associated with selectability %%%%%%%%%%%

  /** If true, checkboxes and ‘select…’ links are shown and the following parameters are honored, else no checkboxes or ‘select…’ links are shown and props below are ignored; default to false */
  isSelectable?: boolean;

  /** List of selected nodes as represented by their ids, defaults to [ ] */
  selectedList: string[];

  /** 
   * List of filtered nodes as represented by their ids used to determine isLeafVisible node status. 
   * Refer to the documentation of the createIsLeafVisible function for a better understanding of its use and behavior.
   * TL;DR: an empty array will render an empty tree whereas an undefined filteredList is ignored
   * */
  filteredList?: string[];

  /** An object mapping a node (by its id) to a function that returns a React component. This component will be used instead of the default checkbox. */
  customCheckboxes?: CustomCheckboxes<T>;

  /** Tells whether more than one selection is allowed; defaults to true.  If false, only the first item in selectedList is selected, and radio boxes are rendered. */
  isMultiPick?: boolean;

  /** Value to use for the name of the checkboxes in the tree */
  name?: string;

  /** Takes array of ids, thus encapsulates:
   selectAll, clearAll, selectDefault, selectCurrent (i.e. reset) */
  onSelectionChange: ChangeHandler;

  /** List of “current” ids, if omitted (undefined or null), then don’t display link */
  currentList?: string[];

  /** List of default ids, if omitted (undefined or null), then don’t display link */
  defaultList?: string[];

  //%%%%%%%%%%% Properties associated with search %%%%%%%%%%%

  /** Indicates whether this is a searchable CBT.  If so, then show boxes and respect the optional parameters below, also turn off expansion; default to false */
  isSearchable: boolean;

  /** Indicates if the search box should have autoFocus set to true */
  autoFocusSearchBox?: boolean;

  /** Whether to show search box; defaults to true (but only if isSearchable is true).  Useful if searching is controlled elsewhere */
  showSearchBox?: boolean;

  /** PlaceHolder text; shown in grey if searchTerm is empty */
  searchBoxPlaceholder: string;

  /** Name of icon to show in search box */
  searchIconName?: 'search' | 'filter';

  /** Position of icon in search box */
  searchIconPosition?: 'left' | 'right';

  /** Search box help text: if present, a help icon will appear; mouseover the icon and a tooltip will appear with this text */
  searchBoxHelp?: string;

  /** Current search term; if non-empty, expandability is disabled */
  searchTerm: string;

  /** Takes single arg: the new search text.  Called when user types into the search box */
  onSearchTermChange: (term: string) => void;

  /** Takes (node, searchTerms) and returns boolean. searchTerms is a list of query terms, parsed from the original input string. This function returns a boolean indicating if a node matches search criteria and should be shown */
  searchPredicate: (node: T, terms: string[]) => boolean;

  renderNoResults?: (searchTerm: string, tree: T) => React.ReactNode;

  //%%%%%%%%%%% Miscellaneous UI %%%%%%%%%%%

  /** Link placement */
  linksPosition?: LinksPosition;

  /** Additional actions to render with links */
  additionalActions?: React.ReactNode[];

  /** Additional filter controls to render with searchbox */
  additionalFilters?: React.ReactNode[];

  /** Indicates if an additional filter has been applied; optional, defaults to false */
  isAdditionalFilterApplied?: boolean;

  /** Wrap tree section with additional UI elements */
  wrapTreeSection?: (treeSection: React.ReactNode) => React.ReactNode;

  styleOverrides?: CheckboxTreeStyleSpec;

  customTreeNodeCssSelectors?: object;
};

type TreeLinkHandler = MouseEventHandler<HTMLButtonElement>;

type TreeLinksProps = {
  showSelectionLinks: boolean;
  showExpansionLinks: boolean;
  showCurrentLink: boolean;
  showDefaultLink: boolean;
  selectAll: TreeLinkHandler;
  selectNone: TreeLinkHandler;
  addVisible: TreeLinkHandler;
  removeVisible: TreeLinkHandler;
  selectOnlyVisible: TreeLinkHandler;
  expandAll: TreeLinkHandler;
  expandNone: TreeLinkHandler;
  selectCurrentList: TreeLinkHandler;
  selectDefaultList: TreeLinkHandler;
  isFiltered: boolean;
  additionalActions?: React.ReactNode[];
  treeLinksStyleSpec: TreeLinksStyleSpec;
}

/**
 * Renders tree links to select, clear, expand, collapse all nodes, or reset to current or default
 */
function TreeLinks({
    showSelectionLinks,
    showExpansionLinks,
    showCurrentLink,
    showDefaultLink,
    selectAll,
    selectNone,
    expandAll,
    expandNone,
    selectCurrentList,
    selectDefaultList,
    addVisible,
    removeVisible,
    selectOnlyVisible,
    isFiltered,
    additionalActions,
    treeLinksStyleSpec
}: TreeLinksProps) {

  const linkStyles = {
    ...treeLinksStyleSpec.links,
    '&:hover': linksHoverDecoration,
  }

  const filteredSelectionLinks = (
    <span>
      <button css={linkStyles} type="button" onClick={selectOnlyVisible}>select only these</button>
      <Bar/>
      <button css={linkStyles} type="button" onClick={addVisible}>add these</button>
      <Bar/>
      <button css={linkStyles} type="button" onClick={removeVisible}>clear these</button>
    </span>
  );

  return (
    <div css={{
        ...treeLinksStyleSpec.container
      }}>

      <div>
        { isFiltered && showSelectionLinks && 
          filteredSelectionLinks
        }
        { !isFiltered && showSelectionLinks &&
          <span>
            <button css={linkStyles} type="button" onClick={selectAll}>select all</button>
            <Bar/>
            <button css={linkStyles} type="button" onClick={selectNone}>clear all</button>
          </span> }

        { showExpansionLinks &&
          <span>
            { showSelectionLinks && <Bar/> }
            <button css={linkStyles} type="button" onClick={expandAll}>expand all</button>
            <Bar/>
            <button css={linkStyles} type="button" onClick={expandNone}>collapse all</button>
          </span> }

        { showSelectionLinks && showCurrentLink &&
          <span>
            <Bar/>
            <button css={linkStyles} type="button" onClick={selectCurrentList}>reset to current</button>
          </span>
        }

        { showSelectionLinks && showDefaultLink &&
          <span>
            <Bar/>
            <button css={linkStyles} type="button" onClick={selectDefaultList}>reset to default</button>
          </span>
        }

      </div>

      { additionalActions && additionalActions.length > 0 &&
        <div style={treeLinksStyleSpec.actionsContainerStyle}>
          { additionalActions.map((action, index, additionalActions) => (
            <span key={index}>
              {action}
              {index !== (additionalActions.length - 1) && <Bar/>}
            </span>
          )) }
        </div>
      }

    </div>
  );
}

type ListFetcher = () => string[] | void;

/**
 * Creates appropriate initial state values for a node in the stateful tree
 */
function getInitialNodeState<T>(node: T, getNodeChildren: (t: T) => T[]) {
  return Object.assign({}, {
    // these state properties apply to all nodes
    isSelected: false, isVisible: true
  }, isLeaf(node, getNodeChildren) ? {} : {
    // these state properties only apply to branch nodes (not leaves)
    isExpanded: false, isIndeterminate: false
  })
}

interface AdditionalFiltersProps {
  filters?: React.ReactNode[];
  filtersStyleSpec?: React.CSSProperties;
}

/**
 * Renders additional filters to supplement the default searchbox
 */
function AdditionalFilters({ filters, filtersStyleSpec }: AdditionalFiltersProps) {
  return (
    <>
      {
        filters != null && filters.length > 0 &&
        <div css={{...filtersStyleSpec}}>
          {
            filters.map((filter, index) => (
              <span key={index}>
                {filter}
              </span>
            ))
          }
        </div>
      }
    </>
  );
}

/**
 * Creates a copy of the input tree, populating each node with initial state.
 * Note this initial state is generic and not dependent on props.  The first
 * call to applyPropsToStatefulTree() applies props to an existing stateful tree.
 */
function createStatefulTree<T>(root: T, getNodeChildren: (t: T) => T[]) {
  const mapFunction = (node: T, mappedChildren: StatefulNode<T>[]) => ({
    ...node,
    __expandableTreeChildren: mappedChildren,
    __expandableTreeState: getInitialNodeState(node, getNodeChildren)
  });
  return mapStructure(mapFunction, getNodeChildren, root);
}

/**
 * Applies a set of expandable tree props to an existing stateful tree (a copy
 * of the input tree with additional state applied).  The resulting tree is a
 * copy of the input stateful tree, with any unchanged nodes staying the same
 * (i.e. same object) so node rendering components can use referential equality
 * to decide whether to re-render.  Any parent of a modified node is replaced
 * with a new node to ensure any modified branches are re-rendered up to the
 * root node.
 *
 * In addition to the replaced tree, the returned object contains the list of
 * expanded nodes.  If an expanded node list is sent in as a prop, it is used,
 * but if the prop is empty or null, the expanded list is generated by the
 * checkbox tree according to the following rules:
 *
 * - if all descendent leaves are selected, the node is collapsed
 * - if no descendent leaves are selected, the node is collapsed
 * - if some but not all descendent leaves are selected, the node is expanded
 */
function applyPropsToStatefulTree<T>(
  root: StatefulNode<T>,
  getNodeId: CheckboxTreeProps<T>['getNodeId'],
  getNodeChildren: CheckboxTreeProps<T>['getNodeChildren'],
  isSelectable: CheckboxTreeProps<T>['isSelectable'],
  isSearchable: CheckboxTreeProps<T>['isSearchable'],
  isMultiPick: CheckboxTreeProps<T>['isMultiPick'],
  searchTerm: CheckboxTreeProps<T>['searchTerm'],
  selectedList: CheckboxTreeProps<T>['selectedList'],
  propsExpandedList: CheckboxTreeProps<T>['expandedList'],
  isAdditionalFilterApplied: CheckboxTreeProps<T>['isAdditionalFilterApplied'],
  isLeafVisible: (id: string) => boolean,
  stateExpandedList?: string[]
) {

  // if single-pick then trim selected list so at most 1 item present
  if (!isMultiPick && selectedList.length > 1) {
    console.warn("CheckboxTree: isMultiPick = false, but more than one item selected.  Ignoring all but first item.");
    selectedList = [ selectedList[0] ];
  }

  // if expanded list is null, then use default rules to determine expansion rather than explicit list
  const expandedList = propsExpandedList != null ? propsExpandedList : stateExpandedList;
  const expansionListProvided = (expandedList != null);
  const generatedExpandedList = new Set<string>();

  // convert arrays to sets for search efficiency
  const selectedSet = new Set<string>(selectedList);
  const expandedSet = new Set<string>(expandedList);

  const mapFunction = (node: StatefulNode<T>, mappedChildren: StatefulNode<T>[]) => {

    const nodeId = getNodeId(node);
    const { isSelected, isVisible, isExpanded, isIndeterminate } = getNodeState(node);
    let newState = Object.assign({}, getNodeState(node));
    let modifyThisNode = false;

    if (isLeaf(node, getNodeChildren)) {
      // only leaves can change via direct selectedness and direct visibility
      const newIsSelected = (isSelectable && selectedSet.has(nodeId));
      const newIsVisible = isLeafVisible(nodeId);
      if (newIsSelected !== isSelected || newIsVisible != isVisible) {
        modifyThisNode = true;
        newState = Object.assign(newState, {
          isSelected: newIsSelected,
          isVisible: newIsVisible
        });
      }
    }
    else {
      // branches can change in all ways; first inspect children to gather information
      let selectedChildFound = false;
      let unselectedChildFound = false;
      let indeterminateChildFound = false;
      let visibleChildFound = false;

      const oldChildren = getStatefulChildren(node);
      for (let i = 0; i < oldChildren.length; i++) {
        const newChild = mappedChildren[i];
        if (newChild !== oldChildren[i]) {
          // reference equality check failed; a child has been modified, so must modify this node
          modifyThisNode = true;
        }
        const newChildState = getNodeState(newChild);
        if (newChildState.isSelected)
          selectedChildFound = true;
        else
          unselectedChildFound = true;
        if (newChildState.isIndeterminate)
          indeterminateChildFound = true;
        if (newChildState.isVisible)
          visibleChildFound = true;
      }

      // determine new state and compare with old to determine if this node should be modified
      const newIsSelected = (!indeterminateChildFound && !unselectedChildFound);
      const newIsIndeterminate = !newIsSelected && (indeterminateChildFound || selectedChildFound);
      const newIsVisible = visibleChildFound;
      const newIsExpanded = (isActiveSearch(isAdditionalFilterApplied, isSearchable, searchTerm) && newIsVisible) ||
          (expansionListProvided ? expandedSet.has(nodeId) :
              (indeterminateChildFound || (selectedChildFound && (!isMultiPick || unselectedChildFound))));

      if (!expansionListProvided && newIsExpanded) {
        generatedExpandedList.add(nodeId);
      }

      if (modifyThisNode ||
          newIsSelected !== isSelected ||
          newIsIndeterminate !== isIndeterminate ||
          newIsExpanded !== isExpanded ||
          newIsVisible !== isVisible) {
        modifyThisNode = true;
        newState = Object.assign(newState, {
          isSelected: newIsSelected,
          isVisible: newIsVisible,
          isIndeterminate: newIsIndeterminate,
          isExpanded: newIsExpanded
        });
      }
    }

    // return the existing node if no changes present in this or children; otherwise create new
    return !modifyThisNode ? node
      : Object.assign({}, node, {
        [NODE_CHILDREN_PROPERTY]: mappedChildren,
        [NODE_STATE_PROPERTY]: newState
      });
  }

  // generate the new stateful tree, and expanded list (if necessary)
  const newStatefulTree = mapStructure(mapFunction, getStatefulChildren, root);
  return {
    // convert whichever Set we want back to an array
    expandedList: Array.from(expansionListProvided ? expandedSet : generatedExpandedList),
    statefulTree: newStatefulTree
  };
}

/**
 * Returns true if a search is being actively performed (i.e. if this tree is
 * searchable, and at least one filter has been applied).
 */
function isActiveSearch<T>(
  isAdditionalFilterApplied: CheckboxTreeProps<T>['isAdditionalFilterApplied'],
  isSearchable: CheckboxTreeProps<T>['isSearchable'],
  searchTerm: CheckboxTreeProps<T>['searchTerm'],
) {
  return isSearchable && isFiltered(searchTerm, isAdditionalFilterApplied);
}

/**
 * Returns true if at least one filter has been applied, that is, if:
 * 1. the search term is non-empty, or
 * 2. an "additional filter" has been applied
 */
function isFiltered(searchTerm: string, isAdditionalFilterApplied?: boolean) {
  return (
    searchTerm.length > 0 ||
    Boolean(isAdditionalFilterApplied)
  );
}

/**
 * Returns a function that takes a leaf node ID and returns true if leaf node
 * should be visible.  If no search is being performed and no filtered list is
 * provided, all leaves are visible unless one of their ancestors is collapsed.
 * In that case visibility of the leaf container is controlled by a parent, so
 * the function returned here will still return true.
 *
 * If a search is being actively performed, then matching nodes, their children, and
 * their ancestors will be visible (expansion is locked and all branches are
 * expanded).
 * 
 * The filteredList prop is only applied to leaves. An important "gotcha" to consider
 * is this: passing an empty array will render no leaves based on leaf filtering logic.
 * If that is not desired, pass in an undefined filteredList prop instead of an empty array.
 * 
 * The function returned by createIsLeafVisible does not care about branches, but tells
 * absolutely if a leaf should be visible (i.e. if the leaf matches the search or if any
 * ancestor matches the search).
 */
function createIsLeafVisible<T>(
  tree: CheckboxTreeProps<T>['tree'],
  searchTerm: CheckboxTreeProps<T>['searchTerm'],
  searchPredicate: CheckboxTreeProps<T>['searchPredicate'],
  getNodeId: CheckboxTreeProps<T>['getNodeId'],
  getNodeChildren: CheckboxTreeProps<T>['getNodeChildren'],
  isAdditionalFilterApplied: CheckboxTreeProps<T>['isAdditionalFilterApplied'],
  isSearchable: CheckboxTreeProps<T>['isSearchable'],
  filteredList: CheckboxTreeProps<T>['filteredList'],
) {
  // if not searching, if no additional filters are applied, and if filteredList is undefined, then all nodes are visible
  if (!isActiveSearch(isAdditionalFilterApplied, isSearchable, searchTerm) && !filteredList) {
    return (nodeId: string) => true;
  }
  // otherwise must construct array of visible leaves
  const visibleLeaves = new Set<string>();
  const searchTerms = parseSearchQueryString(searchTerm);
  const filteredSet = new Set(filteredList);
  const addVisibleLeaves = (node: T, parentMatches: boolean) => {
    const nodeId = getNodeId(node);
    let nodeMatches = false;
    if (parentMatches) {
      // if parent matches, automatically match (always show children of matching parents)
      nodeMatches = parentMatches;
    } else {
      // handles filtering by search only
      nodeMatches = searchPredicate(node, searchTerms)
    }

    if (isLeaf(node, getNodeChildren)) {
      if (nodeMatches) {
        // leaves consider filteredList prop when determining visibleLeaves
        if (!filteredList || (filteredList && filteredSet.has(nodeId))) {
          visibleLeaves.add(nodeId);
        }
      }
    }
    else {
      getNodeChildren(node).forEach(child => {
        addVisibleLeaves(child, nodeMatches);
      });
    }
  }
  addVisibleLeaves(tree, false);
  return (nodeId: string) => visibleLeaves.has(nodeId);
}

/**
 * Returns the stateful children of a node in a stateful tree.  Should be used
 * in lieu of the getNodeChildren prop when rendering the tree.
 */
function getStatefulChildren<T>(node: StatefulNode<T>) {
  return node.__expandableTreeChildren;
}

/**
 * Returns the state of a node in the stateful tree
 */
function getNodeState<T>(node: StatefulNode<T>) {
  return node.__expandableTreeState;
}

/**
 * Expandable tree component
 */
function CheckboxTree<T> (props: CheckboxTreeProps<T>) {
    const {
        tree,
        getNodeId,
        getNodeChildren,
        searchTerm,
        selectedList,
        currentList,
        defaultList,
        isSearchable,
        isAdditionalFilterApplied,
        name,
        shouldExpandDescendantsWithOneChild,
        onExpansionChange,
        isSelectable,
        isMultiPick,
        onSelectionChange,
        showRoot,
        additionalActions,
        linksPosition = LinksPosition.Both,
        showSearchBox,
        autoFocusSearchBox,
        onSearchTermChange,
        searchBoxPlaceholder,
        searchIconName,
        searchIconPosition,
        searchBoxHelp,
        additionalFilters,
        wrapTreeSection,
        shouldExpandOnClick = true,
        customCheckboxes,
        renderNoResults,
        styleOverrides = {},
        customTreeNodeCssSelectors = {},
        renderNode: renderNodeProp
    } = props;

    const styleSpec: CheckboxTreeStyleSpec = useMemo(() => {
      return merge({}, defaultCheckboxTreeStyleSpec, styleOverrides)
    }, [styleOverrides])
        
    // initialize stateful tree; this immutable tree structure will be replaced with each state change
    const treeState = useTreeState(props);

    /**
     * Creates a function that will handle a click of one of the tree links above
    */
    function createLinkHandler(
      idListFetcher: ListFetcher,
      changeHandler: ChangeHandler
    ): TreeLinkHandler {
      return function (event) {
        // prevent update to URL
        event.preventDefault();

        // call instance's change handler with the appropriate ids
        const idList = idListFetcher();
        if (idList !== undefined && idList !== null) {
          changeHandler(idList);
        }
      };
    }
  
    /**
     * Creates a function that will handle expansion-related tree link clicks
     */
    function createExpander(listFetcher: ListFetcher) {
      return createLinkHandler(listFetcher, props.onExpansionChange);
    }
  
    /**
     * Creates a function that will handle selection-related tree link clicks
     */
    function createSelector(listFetcher: ListFetcher) {
      return createLinkHandler(listFetcher, props.onSelectionChange);
    }

    // define event handlers related to expansion
    const expandAll = createExpander(() => getBranches(tree, getNodeChildren).map(node => getNodeId(node)));
    const expandNone = createExpander(() => []);

    // define event handlers related to selection

    // add all nodes to selectedList
    const selectAll = createSelector(() =>
      getLeaves(tree, getNodeChildren).map(getNodeId));

    // remove all nodes from selectedList
    const selectNone = createSelector(() => []);

    // add visible nodes to selectedList
    const addVisible = createSelector(() =>
      Seq.from(selectedList)
        .concat(getLeaves(tree, getNodeChildren)
          .map(getNodeId)
          .filter(treeState.isLeafVisible))
        .uniq()
        .toArray());

    // set selected list to only visible nodes
    const selectOnlyVisible = createSelector(() =>
      getLeaves(tree, getNodeChildren)
      .map(getNodeId)
      .filter(treeState.isLeafVisible));

    // remove visible nodes from selectedList
    const removeVisible = createSelector(() =>
      selectedList
        .filter(nodeId => !treeState.isLeafVisible(nodeId)));


    const selectCurrentList = createSelector(() => currentList);
    const selectDefaultList = createSelector(() => defaultList);

    /**
    * Toggle expansion of the given node.  If node is a leaf, does nothing.
    */
    const toggleExpansion = useCallback((node: T) => {
        if (!isActiveSearch(isAdditionalFilterApplied, isSearchable, searchTerm) && !isLeaf(node, getNodeChildren)) {
            if (!shouldExpandDescendantsWithOneChild || treeState.generated.expandedList.includes(getNodeId(node))) {
            // If "shouldExpandDescendantsWithOneChild" is not set to "true," or the node is already expanded,
            // simply addOrRemove the node to/from the expandedList
            onExpansionChange(addOrRemove(treeState.generated.expandedList, getNodeId(node)));
            } else {
            // Otherwise, add the node and its descendants with one child to the expandedList
            const descendantNodesWithOneChild = _findDescendantsWithOneChild(node);

            const newExpandedList = Seq.from(treeState.generated.expandedList)
            .concat(descendantNodesWithOneChild)
            .uniq()
            .toArray();

            onExpansionChange(newExpandedList);
            }
        }
        function _findDescendantsWithOneChild(descendant: T): Seq<string> {
          const nextNodes = getNodeId(node) === getNodeId(descendant) || getNodeChildren(descendant).length === 1
            ? Seq.from([ getNodeId(descendant) ])
            : Seq.empty<string>();
    
          const remainingNodes = Seq.from(getNodeChildren(descendant)).flatMap(_findDescendantsWithOneChild);
    
          return nextNodes.concat(remainingNodes);
        }
    }, [getNodeChildren, getNodeId, isAdditionalFilterApplied, isSearchable, onExpansionChange, searchTerm, shouldExpandDescendantsWithOneChild, treeState.generated.expandedList]);


    /**
   * Toggle selection of the given node.
   * If toggled checkbox is a selected leaf - add the leaf to the select list to be returned
   * If toggled checkbox is an unselected leaf - remove the leaf from the select list to be returned
   * If toggled checkbox is a selected non-leaf - identify the node's leaves and add them to the select list to be returned
   * If toggled checkbox is an unselected non-leaf - identify the node's leaves and remove them from the select list to be returned
   */
    const toggleSelection = useCallback((node: T, selected: boolean) => {
        if (!isSelectable) return;
        if (isLeaf(node, getNodeChildren)) {
            if (isMultiPick) {
                onSelectionChange(addOrRemove(selectedList, getNodeId(node)));
            }
            else {
                // radio button will only fire if changing from unselected -> selected;
                //   if single-pick, any event means only the clicked node is the new list
                onSelectionChange([ getNodeId(node) ]);
            }
        }
        else {
            const newSelectedList = (selectedList ? selectedList.slice() : []);
            const leafNodes = getLeaves(node, getNodeChildren);
            leafNodes.forEach(leafNode => {
                const leafId = getNodeId(leafNode);
                const index = newSelectedList.indexOf(leafId);
                if (selected && index === -1) {
                    newSelectedList.push(leafId);
                }
                else if (!selected && index > -1) {
                    newSelectedList.splice(index, 1);
                }
            });
            onSelectionChange(newSelectedList);
        }
    }, [getNodeChildren, getNodeId, isMultiPick, isSelectable, onSelectionChange, selectedList]);

    const renderNode = useCallback((node: T, path?: number[]) => {
        return renderNodeProp
            ? renderNodeProp(node, path)
            : <span>{getNodeId(node)}</span>
    }, [getNodeId, renderNodeProp]);

    const topLevelNodes = (showRoot ? [ treeState.generated.statefulTree ] :
      getStatefulChildren(treeState.generated.statefulTree));

    const isTreeVisible = treeState.generated && getNodeState(treeState.generated.statefulTree).isVisible;
    const noResultsRenderFunction = renderNoResults || defaultRenderNoResults;
    const noResultsMessage = isTreeVisible ? null : noResultsRenderFunction(searchTerm, tree);

    const treeLinks = (
      <TreeLinks
        isFiltered={isFiltered(searchTerm, isAdditionalFilterApplied)}
        selectAll={selectAll}
        selectNone={selectNone}
        addVisible={addVisible}
        selectOnlyVisible={selectOnlyVisible}
        removeVisible={removeVisible}
        expandAll={expandAll}
        expandNone={expandNone}
        selectCurrentList={selectCurrentList}
        selectDefaultList={selectDefaultList}
        showSelectionLinks={!!isSelectable && !!isMultiPick}
        showCurrentLink={currentList != null}
        showDefaultLink={defaultList != null}
        showExpansionLinks={!isActiveSearch(isAdditionalFilterApplied, isSearchable, searchTerm)}
        additionalActions={additionalActions}
        treeLinksStyleSpec={styleSpec.treeLinks ?? defaultTreeLinksStyleSpec}
      />
    );

    const treeNodeCssSelectors = useMemo(() => {
      return ({
        '.list': styleSpec.treeNode?.list,
        '.visible-element': { display: '' },
        '.hidden-element': { display: 'none' },
        '.node-wrapper': {...styleSpec.treeNode?.nodeWrapper},
        '.top-level-node-wrapper': {...styleSpec.treeNode?.nodeWrapper, ...styleSpec.treeNode?.topLevelNodeWrapper},
        '.arrow-icon': { fill: '#aaa', fontSize: '0.75em', cursor: 'pointer' },
        '.label-text-wrapper': { ...styleSpec.treeNode?.labelTextWrapper },
        '.leaf-node-label': { ...styleSpec.treeNode?.leafNodeLabel },
        '.node-label': { ...styleSpec.treeNode?.nodeLabel },
        '.children': styleSpec.treeNode?.children,
        '.active-search-buffer': { width: '0.75em' },
        ...customTreeNodeCssSelectors
      })
    }, [styleSpec.treeNode, customTreeNodeCssSelectors])

    const treeSection = (
      <div style={styleSpec.treeSection?.container}>
        <ul 
          style={styleSpec.treeSection?.ul}
          css={treeNodeCssSelectors}
        >
          {topLevelNodes.map((node, index) => {
            const nodeId = getNodeId(node);

            return (
              <CheckboxTreeNode
                key={"node_" + nodeId}
                name={name || ''}
                node={node}
                path={String(index)}
                getNodeState={getNodeState}
                isSelectable={!!isSelectable}
                isMultiPick={!!isMultiPick}
                isActiveSearch={isActiveSearch(isAdditionalFilterApplied, isSearchable, searchTerm)}
                toggleSelection={toggleSelection}
                toggleExpansion={toggleExpansion}
                shouldExpandOnClick={shouldExpandOnClick}
                getNodeId={getNodeId}
                getNodeChildren={getStatefulChildren}
                renderNode={renderNode}
                customCheckboxes={customCheckboxes as unknown as CustomCheckboxes<StatefulNode<T>>}
                isTopLevelNode={true}
              />
            )
            })
          }
        </ul>
      </div>
    )

    return (
      <>
        {linksPosition && linksPosition == LinksPosition.Top ? treeLinks : null}
        {!isSearchable || !showSearchBox ? "" : (
          <div css={{...styleSpec.searchAndFilterWrapper}}>
            <SearchBox
              autoFocus={autoFocusSearchBox}
              searchTerm={searchTerm}
              onSearchTermChange={onSearchTermChange}
              placeholderText={searchBoxPlaceholder}
              iconName={searchIconName}
              iconPosition={searchIconPosition}
              helpText={searchBoxHelp}
              styleOverrides={styleSpec.searchBox}
            />
            <AdditionalFilters
              filters={additionalFilters}
              filtersStyleSpec={styleSpec.additionalFilters?.container}
            />
          </div>
        )}
        {noResultsMessage}
        {wrapTreeSection ? wrapTreeSection(treeSection) : treeSection}
        {linksPosition && linksPosition == LinksPosition.Bottom ? treeLinks : null}
      </>
    );
}

function defaultRenderNoResults() {
  return (
    <div css={{
      display: 'flex',
      margin: '0.5em 1em',
    }}>
      <Warning css={{height: '1.5em', width: '1.5em', paddingRight: '0.25em'}} />
      <span css={{margin: 'auto 0'}}>
        The search term you entered did not yield any results.
      </span>
    </div>
  );
}

const defaultProps = {
  showRoot: false,
  expandedList: null,
  isSelectable: false,
  selectedList: [],
  customCheckboxes: {},
  isMultiPick: true,
  onSelectionChange: () => {/* */},
  isSearchable: false,
  showSearchBox: true,
  searchBoxPlaceholder: "Search...",
  searchBoxHelp: '',
  searchTerm: '',
  onSearchTermChange: () => {/* */},
  searchPredicate: () => true,
  linksPosition: LinksPosition.Both
};

CheckboxTree.defaultProps = defaultProps;
CheckboxTree.LinkPlacement = LinksPosition;
export default CheckboxTree;


function useTreeState<T>(props: CheckboxTreeProps<T>) {
  const {
    tree,
    searchTerm,
    searchPredicate,
    getNodeId,
    getNodeChildren,
    isAdditionalFilterApplied,
    isSearchable,
    isSelectable,
    isMultiPick,
    selectedList,
    expandedList,
    filteredList
  } = props;
  const statefulTree = useMemo(() => createStatefulTree(tree, getNodeChildren), [tree, getNodeChildren]);

  // initialize stateful tree; this immutable tree structure will be replaced with each state change
  const makeTreeState = useCallback(() => {
    const isLeafVisible = createIsLeafVisible(
      tree,
      searchTerm,
      searchPredicate,
      getNodeId,
      getNodeChildren,
      isAdditionalFilterApplied,
      isSearchable,
      filteredList,
    );
    const generatedTreeState = applyPropsToStatefulTree(
      statefulTree,
      getNodeId,
      getNodeChildren,
      isSelectable,
      isSearchable,
      isMultiPick,
      searchTerm,
      selectedList,
      expandedList,
      isAdditionalFilterApplied,
      isLeafVisible,
      undefined
    );
    return {
      isLeafVisible,
      generated: generatedTreeState,
    }
  }, [tree, searchTerm, searchPredicate, getNodeId, getNodeChildren, isAdditionalFilterApplied, isSearchable, statefulTree, isSelectable, isMultiPick, selectedList, expandedList, filteredList]);

  const [treeState, setTreeState] = useState(makeTreeState);

  useEffect(() => {
    function performUpdate() {
      setTreeState(makeTreeState());
    }
    if (searchTerm) {
      const timerId = setTimeout(performUpdate, 250);
      return function cancel() {
        clearTimeout(timerId);
      }
    } else {
      performUpdate();
    }
  }, [makeTreeState, searchTerm])

  return treeState;
}
