import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  return (
    <div className={`prose prose-indigo max-w-none ${className}`}>
      <ReactMarkdown 
        components={{
          // Override default components for better styling
          h1: ({ ...props }) => <h1 className="text-xl font-bold mt-6 mb-4" {...props} />,
          h2: ({ ...props }) => <h2 className="text-lg font-bold mt-5 mb-3" {...props} />,
          h3: ({ ...props }) => <h3 className="text-md font-bold mt-4 mb-2" {...props} />,
          p: ({ ...props }) => <p className="mb-4" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc ml-5 mb-4" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal ml-5 mb-4" {...props} />,
          li: ({ ...props }) => <li className="mb-1" {...props} />,
          a: ({ ...props }) => <a className="text-indigo-600 hover:underline" {...props} />,
          blockquote: ({ ...props }) => <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4" {...props} />,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !className ? (
              <code className="bg-gray-100 px-1 py-0.5 rounded" {...props}>{children}</code>
            ) : (
              <code className={className} {...props}>{children}</code>
            );
          },
          pre: ({ ...props }) => <pre className="bg-gray-100 p-4 rounded-md overflow-auto my-4" {...props} />,
          strong: ({ ...props }) => <strong className="font-bold" {...props} />,
          em: ({ ...props }) => <em className="italic" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}; 