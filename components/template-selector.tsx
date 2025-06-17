"use client";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";

export function TemplateSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-fit text-sm">
        {value === "plain" ? "Plain" : value}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="plain">Plain</SelectItem>
        <SelectItem value="financial">Financial</SelectItem>
      </SelectContent>
    </Select>
  );
}
