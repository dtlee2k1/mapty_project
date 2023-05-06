'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = Date.now().toString().slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance; //km
        this.duration = duration; // minutes
    }
    _setDescription() {
        // prettier-ignore
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        // prettier-ignore
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace() {
        this.pace = this.duration / this.distance;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
    }
}

class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 13;
    #workouts = [];
    constructor() {
        // get user's position
        this._getPosition();
        // get all workouts from localStorage
        this._getLocalStorage();
        // Handle toggle between cadence & elevation
        inputType.addEventListener('change', this._toggleElevationField);
        // Handle Form submission
        form.addEventListener('submit', this._newWorkout.bind(this));

        containerWorkouts.addEventListener(
            'click',
            this._moveToPopup.bind(this)
        );
    }

    _getPosition() {
        navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this),
            function (error) {
                return alert(error.message);
            }
        );
    }

    _loadMap(position) {
        const { latitude: lat, longitude: lng } = position.coords;
        this.#map = L.map('map').setView([lat, lng], this.#mapZoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution:
                '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value =
            inputDuration.value =
            inputCadence.value =
            inputElevation.value =
                '';
        form.style.display = 'none';
        setTimeout(() => {
            form.style.display = 'grid';
            form.classList.add('hidden');
        }, 1000);
    }

    _toggleElevationField() {
        inputCadence
            .closest('.form__row')
            .classList.toggle('form__row--hidden');
        inputElevation
            .closest('.form__row')
            .classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        const { lat, lng } = this.#mapEvent.latlng;
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;

        let workout;

        // Check form validation
        const isAllFinite = (...inputs) =>
            inputs.every(input => Number.isFinite(input));
        const isAllPositive = (...inputs) => inputs.every(input => input > 0);

        // create a new workout object if type = running
        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (
                !isAllFinite(distance, duration, cadence) ||
                !isAllPositive(distance, duration, cadence)
            ) {
                return alert('Inputs have to be positive numbers!');
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // create a new workout object if type = cycling
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (
                !isAllFinite(distance, duration, elevation) ||
                !isAllPositive(distance, duration)
            ) {
                return alert('Inputs have to be positive numbers!');
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }
        // Add workout object to the list
        this.#workouts.push(workout);
        // Render workout marker
        this._renderWorkoutMarker(workout);
        // Render workout list
        this._renderWorkout(workout);
        // hide form after submit
        this._hideForm(workout);
        //// Set local Storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
                    workout.description
                }`,
                {
                    maxWidth: 250,
                    minWidth: 150,
                    autoPan: true,
                    autoClose: true,
                    closeOnClick: true,
                    className: `${workout.type}-popup`,
                }
            )
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${
            workout.id
        }">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${
                        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                    }}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;
        if (workout.type === 'running') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(
                        2
                    )}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `;
        }

        if (workout.type === 'cycling') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(
                        2
                    )}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.elevation}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `;
        }
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        const workout = this.#workouts.find(
            workout => workout.id === workoutEl.dataset.id
        );
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            duration: 1,
            easeLinearity: 0.1,
        });
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;
        this.#workouts = data;
        this.#workouts.forEach(workout => this._renderWorkout(workout));
    }

    reset() {
        localStorage.clearItem('workouts');
        location.reload();
    }
}

const app = new App();
