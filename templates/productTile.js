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
    }
};