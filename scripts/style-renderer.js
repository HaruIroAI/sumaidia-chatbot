/**
 * Style Renderer
 * Lightly adjusts text tone based on emotion without altering facts
 * Minimal and reversible transformations only
 */

export function renderWithStyle(text, { emotionId }) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    // Normalize multiple periods to single
    let styledText = text.replace(/。{2,}/g, '。').replace(/\.{3,}/g, '...');
    
    // Track modifications to limit to 2 per response
    let modificationCount = 0;
    const maxModifications = 2;

    // Helper to check if we can still modify
    const canModify = () => modificationCount < maxModifications;

    // Helper to count emojis in text
    const countEmojis = (str) => {
        const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F680}-\u{1F6FF}]/gu;
        return (str.match(emojiPattern) || []).length;
    };

    // Get current emoji count
    let currentEmojiCount = countEmojis(styledText);
    const maxEmojis = 2;

    switch (emotionId) {
        case 'happy':
        case 'excited':
            // Add excitement to ending if not already there
            if (canModify() && !styledText.match(/[！!✨🎉]+$/)) {
                // Change ending punctuation to exclamation
                if (styledText.match(/[。．]$/)) {
                    styledText = styledText.replace(/[。．]$/, '！');
                    modificationCount++;
                }
                // Add sparkle if room for emoji
                if (canModify() && currentEmojiCount < maxEmojis && !styledText.includes('✨')) {
                    styledText = styledText.replace(/([！!。])$/, '$1✨');
                    currentEmojiCount++;
                    modificationCount++;
                }
            }
            // Add casual ending if appropriate
            if (canModify() && styledText.match(/です[。！]?$/)) {
                styledText = styledText.replace(/です([。！]?)$/, 'だよ$1');
                modificationCount++;
            }
            break;

        case 'grateful':
            // Add thank you if not already present
            if (canModify() && !styledText.match(/ありがと|感謝|お礼/)) {
                // Only add if it makes sense contextually
                if (styledText.match(/^(はい|分かりました|了解|承知)/)) {
                    styledText += ' ありがとうございます！';
                    modificationCount++;
                }
            }
            // Add heart emoji if appropriate and room
            if (canModify() && currentEmojiCount < maxEmojis && 
                styledText.match(/ありがと/) && !styledText.match(/[💕❤️🙏]/)) {
                styledText = styledText.replace(/([！!。])$/, '$1💕');
                currentEmojiCount++;
                modificationCount++;
            }
            break;

        case 'thinking':
            // Add thinking prefix if not present
            if (canModify() && !styledText.match(/^(うーん|そうですね|えーと|ちょっと)/)) {
                // Check if it's a question or contemplative response
                if (styledText.match(/かな[？?。]|でしょう|思います/)) {
                    styledText = 'うーん、' + styledText;
                    modificationCount++;
                }
            }
            // Add ellipsis for contemplation
            if (canModify() && styledText.match(/[。]$/) && styledText.length < 50) {
                styledText = styledText.replace(/。$/, '...');
                modificationCount++;
            }
            break;

        case 'confused':
            // Add confusion marker
            if (canModify() && !styledText.match(/[？?]/)) {
                if (styledText.match(/[。．]$/)) {
                    styledText = styledText.replace(/[。．]$/, '...？');
                    modificationCount++;
                }
            }
            break;

        case 'sad':
        case 'worried':
        case 'apologetic':
            // Add apology if contextually appropriate
            if (emotionId === 'apologetic' && canModify() && 
                !styledText.match(/ごめん|すみません|申し訳/)) {
                // Only for error or negative responses
                if (styledText.match(/できません|ありません|わかりません/)) {
                    styledText = 'ごめんね、' + styledText;
                    modificationCount++;
                }
            }
            // Add sweat emoji sparingly
            if (canModify() && currentEmojiCount < maxEmojis && 
                styledText.match(/申し訳|ごめん/) && !styledText.includes('💦')) {
                styledText = styledText.replace(/([。！])$/, '💦$1');
                currentEmojiCount++;
                modificationCount++;
            }
            break;

        case 'wink':
        case 'playful':
            // Add playful tone
            if (canModify() && currentEmojiCount < maxEmojis && !styledText.match(/[😉😜]/)) {
                if (styledText.match(/[！!。]$/)) {
                    styledText = styledText.replace(/([！!。])$/, '😉$1');
                    currentEmojiCount++;
                    modificationCount++;
                }
            }
            break;

        case 'sleepy':
            // Add sleepy marker
            if (canModify() && !styledText.match(/眠|ねむ|おやすみ/)) {
                if (styledText.match(/。$/)) {
                    styledText = styledText.replace(/。$/, '...💤');
                    currentEmojiCount++;
                    modificationCount++;
                }
            }
            break;

        case 'motivated':
            // Add motivational ending
            if (canModify() && styledText.match(/頑張|がんば|やりましょう/)) {
                if (!styledText.match(/[！!]/)) {
                    styledText = styledText.replace(/[。]$/, '！');
                    modificationCount++;
                }
            }
            break;

        case 'neutral':
        default:
            // No transformation for neutral or unknown emotions
            break;
    }

    // Final cleanup - ensure we don't have duplicate punctuation
    styledText = styledText.replace(/([！!]){2,}/g, '$1');
    styledText = styledText.replace(/([。]){2,}/g, '$1');
    
    // Ensure emoji count doesn't exceed limit (defensive)
    const finalEmojiCount = countEmojis(styledText);
    if (finalEmojiCount > maxEmojis) {
        // Remove excess emojis from the end
        const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F680}-\u{1F6FF}]/gu;
        let emojiMatches = [...styledText.matchAll(emojiPattern)];
        while (emojiMatches.length > maxEmojis) {
            const lastEmoji = emojiMatches.pop();
            styledText = styledText.substring(0, lastEmoji.index) + 
                       styledText.substring(lastEmoji.index + lastEmoji[0].length);
        }
    }

    return styledText;
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.renderWithStyle = renderWithStyle;
}