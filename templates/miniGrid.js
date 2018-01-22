let productTile = require('./productTile');

module.exports = {
    render: function(data) {
        return `
<div class="mini-grid">
    <button data-toggle="showFilter">toggle filter</button>
    ${data.showFilter ? `
        <div class="filter">
            <select data-action="change:sortProducts">
                <option value="">sort by</option>
                <option value="lowest-price"${data.sorting === 'lowest-price' ? ' selected' : ''}>price asc</option>
                <option value="highest-price"${data.sorting === 'highest-price' ? ' selected' : ''}>price desc</option>
            </select>
        </div>
    ` : ''}
    <ul class="grid-item-container">
        ${data.featuredProducts && data.featuredProducts.length > 0 && data.featuredProducts.map(product => `
            <li class="grid-item">
                ${productTile.render(product)}
            </li>
        `).join('') || '<li>No products found.</li>'}
    </ul>
</div>
`;
    },

    styles: `
.mini-grid .grid-item-container {
    display: flex;
    flex-wrap: wrap;
    list-style-type: none;
    margin: 0;
    padding: 0;
}
.mini-grid .grid-item {
    flex: 1 1 33%;
    margin: 0;
    padding: 0;
    margin: 0.25em 0.5em;
}
`
};