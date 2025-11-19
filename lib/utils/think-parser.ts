export interface ContentPart {
    type: 'text' | 'think';
    content: string;
    closed?: boolean;
}

export const parseThinkTags = (content: string): ContentPart[] => {
    const regex = /<think>([\s\S]*?)(?:(<\/think>)|$)/g;
    const parts: ContentPart[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: content.slice(lastIndex, match.index),
            });
        }

        parts.push({
            type: 'think',
            content: match[1],
            closed: !!match[2],
        });

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
        parts.push({
            type: 'text',
            content: content.slice(lastIndex),
        });
    }

    return parts;
};
