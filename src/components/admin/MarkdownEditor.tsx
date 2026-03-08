import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, Image, Code, Quote, Minus, Eye, Edit,
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const toolbarItems = [
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**", placeholder: "bold text" },
  { icon: Italic, label: "Italic", prefix: "_", suffix: "_", placeholder: "italic text" },
  { icon: Heading1, label: "H1", prefix: "# ", suffix: "", placeholder: "Heading 1" },
  { icon: Heading2, label: "H2", prefix: "## ", suffix: "", placeholder: "Heading 2" },
  { icon: Heading3, label: "H3", prefix: "### ", suffix: "", placeholder: "Heading 3" },
  { icon: List, label: "Bullet list", prefix: "- ", suffix: "", placeholder: "List item" },
  { icon: ListOrdered, label: "Numbered list", prefix: "1. ", suffix: "", placeholder: "List item" },
  { icon: Quote, label: "Quote", prefix: "> ", suffix: "", placeholder: "Quote" },
  { icon: Code, label: "Code", prefix: "`", suffix: "`", placeholder: "code" },
  { icon: LinkIcon, label: "Link", prefix: "[", suffix: "](url)", placeholder: "link text" },
  { icon: Image, label: "Image", prefix: "![alt](", suffix: ")", placeholder: "image-url" },
  { icon: Minus, label: "Divider", prefix: "\n---\n", suffix: "", placeholder: "" },
];

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your content using Markdown...",
  minHeight = "300px",
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<string>("write");

  const insertFormatting = useCallback(
    (prefix: string, suffix: string, placeholderText: string) => {
      const textarea = document.getElementById("md-editor") as HTMLTextAreaElement | null;
      if (!textarea) {
        onChange(value + prefix + placeholderText + suffix);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.substring(start, end);
      const replacement = prefix + (selected || placeholderText) + suffix;
      const newValue = value.substring(0, start) + replacement + value.substring(end);
      onChange(newValue);

      // Restore cursor
      setTimeout(() => {
        textarea.focus();
        const cursorPos = start + prefix.length + (selected || placeholderText).length;
        textarea.setSelectionRange(
          selected ? start + prefix.length : start + prefix.length,
          selected ? start + prefix.length + selected.length : cursorPos
        );
      }, 0);
    },
    [value, onChange]
  );

  return (
    <div className="rounded-lg border border-input">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between border-b border-border px-2 py-1">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-0.5">
            {toolbarItems.map((item) => (
              <Button
                key={item.label}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title={item.label}
                onClick={() => insertFormatting(item.prefix, item.suffix, item.placeholder)}
              >
                <item.icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
          <TabsList className="h-7 p-0.5">
            <TabsTrigger value="write" className="h-6 px-2 text-xs">
              <Edit className="mr-1 h-3 w-3" /> Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-6 px-2 text-xs">
              <Eye className="mr-1 h-3 w-3" /> Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="write" className="m-0">
          <Textarea
            id="md-editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="rounded-none border-0 focus-visible:ring-0"
            style={{ minHeight }}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-4"
            style={{ minHeight }}
          >
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
