module.exports = {
    render(data) {
        return `
<div class="product-tile">
    <a href="${data.url}">
        <img src="${data.image}" alt="${data.name}" border="0"/>
        <div class="product-name">
            ${data.name}
        </div>
        <div class="product-price">
            ${data.price}
        </div>
    </a>
</div>
`;
    },

    styles() {
        return `
.product-tile a {
    text-decoration: none;
    color: black;
}
.product-tile img {
    width: 100%;
    border: 0;
}
.product-tile .product-name {
    font-weight: bold;
}
.product-tile .product-price {
    color: #666;
    font-style: italic;
    font-size: 0.8em;
}
`;
    }
};