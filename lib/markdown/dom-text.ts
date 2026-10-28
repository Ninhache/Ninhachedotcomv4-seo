/**
 * Le texte d'un noeud rendu, avec une frontiere apres chaque element.
 *
 * `textContent` seul concatene sans separateur : deux cellules de tableau
 * `<td>jusqu'a</td><th>Entretien</th>` deviennent « jusqu'aEntretien », un token
 * fantome qui fait disparaitre deux mots reels du comptage. C'est exactement le
 * bug corrige cote aspiration dans `lib/seo/serp.mjs` (`extractText`), et la
 * meme correction doit s'appliquer ici, sans quoi le brief et le score ne
 * decoupent pas les mots de la meme facon.
 *
 * @param root Le noeud dont on veut le texte, typiquement un conteneur hors ecran.
 * @returns Le texte, espaces normalises.
 */
export function domText(root: Node): string {
    let out = '';
    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            out += node.nodeValue ?? '';
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        node.childNodes.forEach(walk);
        out += ' ';
    };
    root.childNodes.forEach(walk);
    return out.replace(/\s+/g, ' ').trim();
}
