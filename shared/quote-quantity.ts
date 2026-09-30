export function quoteQuantity(line: {quantity:string; unit:"units"|"cases"; product:{caseSize?:number|string|null}}) {
    const amount = Number(line.quantity), caseSize = Number(line.product.caseSize);
    if (!/^\d+$/.test(line.quantity) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000)
        throw new Error("Enter a whole quantity between 1 and 1,000,000.");
    if (line.unit === "cases" && (!Number.isSafeInteger(caseSize) || caseSize < 1))
        throw new Error("Case size is not confirmed. Request units and include your case requirement in the notes.");
    const result = line.unit === "cases" ? amount * caseSize : amount;
    if (result > 1000000)
        throw new Error("The total units on one line cannot exceed 1,000,000.");
    return result;
}
