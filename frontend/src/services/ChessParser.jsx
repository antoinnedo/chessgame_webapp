export default class ChessParser {
  normalize(text) {
    return text.toLowerCase()
      // Remove all punctuation
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
      .replace(/\b(to|too|2)\b/g, '')
      .replace(/\b(pawn|upon|on|go|move)\b/g, '')
      .replace(/\b(takes|tech|text|captures|x)\b/g, 'x')
      .replace(/\b(castle|castles)\b/g, 'O-O')
      //castling variations
      .replace(/\b(castle|castles)\s+(kingside|king-side|short)\b/g, 'O-O')      // explicit kingside
      .replace(/\b(castle|castles)\s+(queenside|queen-side|left|long)\b/g, 'O-O-O') // explicit queenside
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
      .replace(/\b(recording|record)\b/g, '')
      .replace(/O-O-O/g, 'O-O-O')     // normalize queenside
      .replace(/O-O/g, 'O-O')         // normalize kingside
      .replace(/([a-h])\1+/g, '$1')   // dedupe file: aa4 → a4
      .replace(/([1-8])\1+/g, '$1')   // dedupe rank: e44 → e4
      // Remove all remaining spaces
      .replace(/(\s)+/g, '');
  }

  /**
   * Normalizes and parses a spoken chess move.
   * @param {string} text - The raw spoken text.
   * @returns {string|null} The move in SAN notation or null if not found.
   */
  parse(text) {
    const normalizedText = this.normalize(text);
    console.log(`Normalized text: "${normalizedText}"`);

    const moveRegex = /([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|O-O-O|O-O)/gi;
    const matches = [...normalizedText.matchAll(moveRegex)];

    if (matches.length === 0) {
      return null;
    }

    let longestMatch = "";
    for (const match of matches) {
      if (match[0].length > longestMatch.length) {
        longestMatch = match[0];
      }
    }

    return longestMatch;
  }
}
