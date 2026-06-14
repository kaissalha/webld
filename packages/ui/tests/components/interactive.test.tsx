import * as React from "react";

import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "../../src/components/accordion";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogPopup,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "../../src/components/alert-dialog";
import {
	Autocomplete,
	AutocompleteInput,
	AutocompleteItem,
	AutocompleteList,
	AutocompletePopup,
} from "../../src/components/autocomplete";
import { Calendar } from "../../src/components/calendar";
import { Checkbox } from "../../src/components/checkbox";
import { CheckboxGroup } from "../../src/components/checkbox-group";
import { Combobox, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "../../src/components/combobox";
import { Dialog, DialogDescription, DialogPopup, DialogTitle, DialogTrigger } from "../../src/components/dialog";
import { Drawer, DrawerDescription, DrawerPopup, DrawerTitle, DrawerTrigger } from "../../src/components/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../../src/components/dropdown-menu";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../src/components/input-otp";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "../../src/components/navigation-menu";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "../../src/components/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "../../src/components/popover";
import { RadioGroup, RadioGroupItem } from "../../src/components/radio-group";
import { ResizablePanel, ResizablePanelGroup, ResizableSeparator } from "../../src/components/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../src/components/select";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from "../../src/components/sidebar";
import { Slider } from "../../src/components/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../src/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/components/tabs";
import { ToastProvider } from "../../src/components/toast";
import { ToggleGroup, ToggleGroupItem } from "../../src/components/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../src/components/tooltip";

const ResizableGroup = ResizablePanelGroup as unknown as React.ComponentType<{
	direction: "horizontal" | "vertical";
	children: React.ReactNode;
}>;

const cases: Array<{ name: string; element: React.ReactElement }> = [
	{
		name: "Accordion",
		element: (
			<Accordion multiple={false} defaultValue={["item-1"]}>
				<AccordionItem value='item-1'>
					<AccordionTrigger>Item</AccordionTrigger>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>
		),
	},
	{
		name: "AlertDialog",
		element: (
			<AlertDialog defaultOpen>
				<AlertDialogTrigger>Open</AlertDialogTrigger>
				<AlertDialogPopup>
					<AlertDialogTitle>Title</AlertDialogTitle>
					<AlertDialogDescription>Description</AlertDialogDescription>
					<AlertDialogClose>Close</AlertDialogClose>
				</AlertDialogPopup>
			</AlertDialog>
		),
	},
	{
		name: "Autocomplete",
		element: (
			<Autocomplete defaultValue='alpha'>
				<AutocompleteInput aria-label='Autocomplete' />
				<AutocompletePopup>
					<AutocompleteList>
						<AutocompleteItem value='alpha'>Alpha</AutocompleteItem>
					</AutocompleteList>
				</AutocompletePopup>
			</Autocomplete>
		),
	},
	{
		name: "Combobox",
		element: (
			<Combobox defaultValue='alpha'>
				<ComboboxInput aria-label='Combobox' />
				<ComboboxPopup>
					<ComboboxList>
						<ComboboxItem value='alpha'>Alpha</ComboboxItem>
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
		),
	},
	{
		name: "Dialog",
		element: (
			<Dialog defaultOpen>
				<DialogTrigger>Open</DialogTrigger>
				<DialogPopup>
					<DialogTitle>Title</DialogTitle>
					<DialogDescription>Description</DialogDescription>
				</DialogPopup>
			</Dialog>
		),
	},
	{
		name: "DropdownMenu",
		element: (
			<DropdownMenu>
				<DropdownMenuTrigger>Open</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Item</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
	{
		name: "Tabs",
		element: (
			<Tabs defaultValue='tab-1'>
				<TabsList>
					<TabsTrigger value='tab-1'>Tab 1</TabsTrigger>
					<TabsTrigger value='tab-2'>Tab 2</TabsTrigger>
				</TabsList>
				<TabsContent value='tab-1'>Content 1</TabsContent>
				<TabsContent value='tab-2'>Content 2</TabsContent>
			</Tabs>
		),
	},
	{
		name: "Calendar",
		element: <Calendar mode='single' selected={new Date()} onSelect={() => undefined} />,
	},
	{
		name: "InputOTP",
		element: (
			<InputOTP value='12' onChange={() => undefined} maxLength={2}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
				</InputOTPGroup>
			</InputOTP>
		),
	},
	{
		name: "Pagination",
		element: (
			<Pagination>
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious href='#' />
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#' isActive>
							1
						</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationNext href='#' />
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		),
	},
	{
		name: "Resizable",
		element: (
			<ResizableGroup direction='horizontal'>
				<ResizablePanel>Left</ResizablePanel>
				<ResizableSeparator />
				<ResizablePanel>Right</ResizablePanel>
			</ResizableGroup>
		),
	},
	{
		name: "Select",
		element: (
			<Select defaultValue='alpha'>
				<SelectTrigger aria-label='Select'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='alpha'>Alpha</SelectItem>
				</SelectContent>
			</Select>
		),
	},
	{
		name: "Sidebar",
		element: (
			<SidebarProvider defaultOpen>
				<Sidebar>
					<SidebarHeader>Header</SidebarHeader>
					<SidebarContent>Content</SidebarContent>
				</Sidebar>
			</SidebarProvider>
		),
	},
	{
		name: "Table",
		element: (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Header</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<TableRow>
						<TableCell>Cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		),
	},
	{
		name: "Toast",
		element: (
			<ToastProvider>
				<div>Toast region</div>
			</ToastProvider>
		),
	},
	{
		name: "Tooltip",
		element: (
			<TooltipProvider>
				<Tooltip defaultOpen>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent>Content</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		),
	},
	{
		name: "NavigationMenu",
		element: (
			<NavigationMenu>
				<NavigationMenuList>
					<NavigationMenuItem>
						<NavigationMenuTrigger>Menu</NavigationMenuTrigger>
						<NavigationMenuContent>
							<NavigationMenuLink href='#'>Link</NavigationMenuLink>
						</NavigationMenuContent>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>
		),
	},
	{
		name: "Slider",
		element: <Slider defaultValue={[50]} max={100} step={1} />,
	},
	{
		name: "ToggleGroup",
		element: (
			<ToggleGroup multiple defaultValue={["bold"]}>
				<ToggleGroupItem value='bold'>Bold</ToggleGroupItem>
				<ToggleGroupItem value='italic'>Italic</ToggleGroupItem>
			</ToggleGroup>
		),
	},
	{
		name: "RadioGroup",
		element: (
			<RadioGroup defaultValue='a'>
				<RadioGroupItem value='a' />
				<RadioGroupItem value='b' />
			</RadioGroup>
		),
	},
	{
		name: "CheckboxGroup",
		element: (
			<CheckboxGroup defaultValue={["a"]} onValueChange={() => undefined}>
				<div className='flex items-center gap-2'>
					<Checkbox value='a' />
					<span>A</span>
				</div>
				<div className='flex items-center gap-2'>
					<Checkbox value='b' />
					<span>B</span>
				</div>
			</CheckboxGroup>
		),
	},
	{
		name: "Drawer",
		element: (
			<Drawer defaultOpen position='right'>
				<DrawerTrigger>Open</DrawerTrigger>
				<DrawerPopup variant='inset'>
					<DrawerTitle>Title</DrawerTitle>
				</DrawerPopup>
			</Drawer>
		),
	},
	{
		name: "Popover",
		element: (
			<Popover defaultOpen>
				<PopoverTrigger>Open</PopoverTrigger>
				<PopoverContent>Content</PopoverContent>
			</Popover>
		),
	},
	{
		name: "Drawer",
		element: (
			<Drawer defaultOpen>
				<DrawerTrigger>Open</DrawerTrigger>
				<DrawerPopup>
					<DrawerTitle>Title</DrawerTitle>
					<DrawerDescription>Description</DrawerDescription>
				</DrawerPopup>
			</Drawer>
		),
	},
];

describe("interactive components", () => {
	it.each(cases)("'$name' renders", async ({ element }) => {
		const result = await act(async () => render(element));
		expect(result.container).toBeDefined();
	});
});
