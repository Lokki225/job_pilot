"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, AlertCircle, Info, Lightbulb } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded-full" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-100 mt-6 mb-3">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200 mt-4 mb-2">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 text-[16px]">
              {children}
            </p>
          ),

          // Bold & Italic
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-600 dark:text-gray-400">
              {children}
            </em>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="my-4 ml-2 space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-2 space-y-2 list-decimal list-inside">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
              <span className="mt-2 w-2 h-2 bg-blue-500 rounded-full shrink-0" />
              <span className="flex-1">{children}</span>
            </li>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="my-6 pl-4 py-3 pr-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-gray-700 dark:text-gray-300 italic">
                  {children}
                </div>
              </div>
            </blockquote>
          ),

          // Code
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className} block p-4 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono my-4`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 rounded-lg overflow-hidden">
              {children}
            </pre>
          ),

          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-700 underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),

          // Horizontal Rule
          hr: () => (
            <hr className="my-8 border-t-2 border-gray-200 dark:border-gray-700" />
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
              {children}
            </td>
          ),

          // Images
          img: ({ src, alt }) => (
            <figure className="my-6">
              <img 
                src={src} 
                alt={alt || ""} 
                className="rounded-lg shadow-lg w-full"
              />
              {alt && (
                <figcaption className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Special callout components for lessons
export function TipBox({ children, title = "💡 Tip" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="my-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">{title}</h4>
          <div className="text-amber-700 dark:text-amber-400 text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function WarningBox({ children, title = "⚠️ Warning" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="my-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">{title}</h4>
          <div className="text-red-700 dark:text-red-400 text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function SuccessBox({ children, title = "✅ Success" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="my-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">{title}</h4>
          <div className="text-green-700 dark:text-green-400 text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function InfoBox({ children, title = "ℹ️ Note" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="my-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">{title}</h4>
          <div className="text-blue-700 dark:text-blue-400 text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
