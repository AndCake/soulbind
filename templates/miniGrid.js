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
    }
};