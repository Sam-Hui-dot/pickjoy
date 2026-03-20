const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const itemListEl = document.getElementById('itemList');
const addItemBtn = document.getElementById('addItemBtn');

let items = [
    { text: 'Topic 1', weight: 1 },
    { text: 'Topic 2', weight: 1 },
    { text: 'Topic 3', weight: 1 },
    { text: 'Topic 4', weight: 1 }
];

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'];

let currentRotation = 0;
let isSpinning = false;

function drawWheel() {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startAngle = -Math.PI / 2; // Start from top

    items.forEach((item, i) => {
        const sliceAngle = (item.weight / totalWeight) * (Math.PI * 2);
        
        // Draw Slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(item.text, radius - 20, 5);
        ctx.restore();

        startAngle += sliceAngle;
    });
}

function renderItemList() {
    itemListEl.innerHTML = '';
    items.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <input type="text" value="${item.text}" onchange="updateItem(${index}, 'text', this.value)">
            <input type="number" value="${item.weight}" min="1" onchange="updateItem(${index}, 'weight', this.value)">
            <button class="delete-btn" onclick="deleteItem(${index})">×</button>
        `;
        itemListEl.appendChild(row);
    });
    drawWheel();
}

window.updateItem = (index, key, value) => {
    if (key === 'weight') value = parseFloat(value) || 1;
    items[index][key] = value;
    drawWheel();
};

window.deleteItem = (index) => {
    if (items.length <= 2) return alert('至少保留两个选项');
    items.splice(index, 1);
    renderItemList();
};

addItemBtn.onclick = () => {
    items.push({ text: `Topic ${items.length + 1}`, weight: 1 });
    renderItemList();
};

spinBtn.onclick = () => {
    if (isSpinning) return;
    
    isSpinning = true;
    spinBtn.disabled = true;

    // Calculate winning slice based on weight
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const randomWeight = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    let winnerIndex = 0;
    for (let i = 0; i < items.length; i++) {
        cumulativeWeight += items[i].weight;
        if (randomWeight <= cumulativeWeight) {
            winnerIndex = i;
            break;
        }
    }

    // Calculate rotation to land winner at top
    const sliceAngleDeg = (items[winnerIndex].weight / totalWeight) * 360;
    
    // Previous cumulative angle in degrees
    let prevWeightAngle = 0;
    for (let i = 0; i < winnerIndex; i++) {
        prevWeightAngle += (items[i].weight / totalWeight) * 360;
    }

    const winnerCenterDeg = prevWeightAngle + sliceAngleDeg / 2;
    const targetRotation = 360 * 5 + (360 - winnerCenterDeg); // 5 full spins + offset
    
    currentRotation += targetRotation;
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        spinBtn.disabled = false;
        alert(`恭喜！你抽中了: ${items[winnerIndex].text}`);
        // Reset rotation visually to keep it within 360 for clean math if needed
        // but not strictly necessary with the current additive approach
    }, 4000);
};

// Initial Render
renderItemList();
