import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const categories = [
  { value: "all", label: "All Products" },
  { value: "composters", label: "Composters" },
  { value: "equipment", label: "Equipment" },
  { value: "compost", label: "Compost" },
  { value: "accessories", label: "Accessories" },
];

interface Props {
  category: string;
  onCategoryChange: (c: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

export default function ProductFilters({ category, onCategoryChange, search, onSearchChange }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <Button
            key={c.value}
            variant={category === c.value ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(c.value)}
          >
            {c.label}
          </Button>
        ))}
      </div>
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
