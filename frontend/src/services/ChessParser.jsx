export default class ChessParser {
  normalize(text) {
    return text.toLowerCase()
      // Remove all punctuation
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
      .replace(/\b(to|too|2)\b/g, '')
      .replace(/\b(pawn|upon|on|go|move)\b/g, '')
      .replace(/\b(takes|captures|x)\b/g, 'x')
      .replace(/\b(castle|castles)\b/g, 'O-O')
      // Convert number words to digits
      .replace(/\b(one|1)\b/g, '1')
      .replace(/\b(two|to|too)\b/g, '2') // "to" is often heard for "2"
      .replace(/\b(three|tree|free)\b/g, '3') // "free" is a common error
      .replace(/\b(four|for|fore)\b/g, '4') // "for" is a common error
      .replace(/\b(five|pipe)\b/g, '5')
      .replace(/\b(six|sex)\b/g, '6')
      .replace(/\b(seven)\b/g, '7')
      .replace(/\b(eight|ate)\b/g, '8')
      // Convert piece names
      .replace(/\b(knight|night|9)\b/g, 'N')
      .replace(/\b(bishop)\b/g, 'B')
      .replace(/\b(rook|rock|look)\b/g, 'R')
      .replace(/\b(queen)\b/g, 'Q')
      .replace(/\b(king)\b/g, 'K')
      .replace(/\b(pawn|upon|on)\b/g, '') // Remove pawn, "on", etc.
      // Convert letters (in case it spells them)
      .replace(/\b(a|hay)\b/g, 'a')
      .replace(/\b(b|be|bee)\b/g, 'b')
      .replace(/\b(c|see|sea)\b/g, 'c')
      .replace(/\b(d|dee)\b/g, 'd')
      .replace(/\b(e|easy)\b/g, 'e')
      .replace(/\b(f|if|at)\b/g, 'f')
      .replace(/\b(g|gee)\b/g, 'g')
      .replace(/\b(h|aitch)\b/g, 'h')
      // Handle common words
      .replace(/\b(castle|castles)\b/g, 'O-O')
      .replace(/\b(takes|captures|x)\b/g, 'x')
      // Remove all remaining spaces
      .replace(/(\s)+/g, '');
  }

  /**
   * Normalizes and parses a spoken chess move.
   * @param {string} text - The raw spoken text.
   * @returns {string|null} The move in SAN notation or null if not found.
   */
  parse(text) {
    if (!text) return null;

    const normalizedText = this.normalize(text);
    console.log(`Normalized text: "${normalizedText}"`);

    // Regex to find a SAN move (e.g., Nf3, e4, O-O, a8=Q)
    const moveRegex = /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|O-O-O|O-O)\b/i;
    
    for (let i = normalizedText.length; i > 0; i--) {
      const sub = normalizedText.substring(i - 1);
      const matches = sub.match(moveRegex);
      if (matches) {
        return matches[0];
      }
    }
    
    return null;
  }
}