import { cn } from "@starter/ui/lib/utils";

export const Logo = ({ className }: { className?: string }) => {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			viewBox='0 15 100 100'
			className={cn("text-black", className)}
			fill='none'
		>
			<polygon points='50,50 65,65 50,80 35,65' fill='currentColor' />
			<line x1='50' y1='17' x2='50' y2='56' stroke='currentColor' strokeWidth='5' />
			<line x1='2' y1='65' x2='38' y2='65' stroke='currentColor' strokeWidth='5' />
			<line x1='62' y1='65' x2='98' y2='65' stroke='currentColor' strokeWidth='5' />
			<line x1='36' y1='48' x2='20' y2='32' stroke='currentColor' strokeWidth='5' />
			<line x1='64' y1='48' x2='80' y2='32' stroke='currentColor' strokeWidth='5' />
			<line x1='50' y1='76' x2='50' y2='113' stroke='currentColor' strokeWidth='5' />
			<line x1='36' y1='82' x2='20' y2='98' stroke='currentColor' strokeWidth='5' />
			<line x1='64' y1='82' x2='80' y2='98' stroke='currentColor' strokeWidth='5' />
		</svg>
	);
};
