
import * as THREE from "https://cdn.skypack.dev/three";

// === DOMContentLoaded wrapper ===
window.addEventListener("DOMContentLoaded", () => {
  // (abbreviated init logic) ...

  function addCheckboxes(pitcherData) {
    const container = document.getElementById('pitchCheckboxes');
    container.innerHTML = '';

    const pitchGroups = {};

    for (const key in pitcherData) {
      const [pitchType, zone] = key.split(' ');
      if (!pitchGroups[pitchType]) pitchGroups[pitchType] = {};
      pitchGroups[pitchType][Number(zone)] = pitcherData[key];
    }

    for (const pitchType in pitchGroups) {
      const group = document.createElement('div');
      group.className = 'pitch-type-group';

      const title = document.createElement('div');
      title.className = 'pitch-type-title';
      title.textContent = pitchType;

      const grid = document.createElement('div');
      grid.className = 'checkbox-grid';

      for (let zone = 1; zone <= 9; zone++) {
        const combo = `${pitchType} ${zone}`;
        if (!pitchGroups[pitchType][zone]) continue;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = combo;
        checkbox.checked = false;

        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            throwBall(pitchGroups[pitchType][zone], combo);
          } else {
            removeBallByType(combo);
          }
        });

        const label = document.createElement('label');
        label.htmlFor = combo;
        label.textContent = zone;

        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-group';
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);

        grid.appendChild(wrapper);
      }

      group.appendChild(title);
      group.appendChild(grid);
      container.appendChild(group);
    }
  }

  // Simulate the rest of the visualizer code below...
});
