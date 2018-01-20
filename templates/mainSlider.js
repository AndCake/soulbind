module.exports = {
    render: function(data) {
        return `
<div class="main-slider">            
    <ul>
        ${data.sliderItems && data.sliderItems.length > 0 && data.sliderItems.map((item, index) => `
            <li class="slider-item" data-action="actions.removeSliderItem:sliderItems.${index}">${item}</li>
        `).join('') || '<li class="slider-item"><p>Nothing here</p></li>'}
    </ul>
</div>
`;
    }
};