
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// Khai báo biến ở phạm vi module
let scene, camera, renderer, model, controls;

// Định nghĩa hàm init
function init() {
    console.log("Initializing Three.js scene...");

    // --- Container Setup ---
    const carCanvasContainer = document.getElementById('car-canvas');
    if (!carCanvasContainer) {
        console.error("FATAL: Container element with id 'car-canvas' not found!");
        return;
    }
    const containerWidth = carCanvasContainer.clientWidth;
    const containerHeight = carCanvasContainer.clientHeight;

    if (containerWidth === 0 || containerHeight === 0) {
        console.warn("Container #car-canvas has zero width or height. Ensure it's visible via CSS.");
    }

    // --- Scene Setup ---
    scene = new THREE.Scene();
    // Đặt màu nền tối hơn một chút, hơi xanh dương để tạo cảm giác studio nhẹ
    // scene.background = new THREE.Color(0x222831); // Màu tối, hơi lạnh

    // --- Camera Setup ---
    camera = new THREE.PerspectiveCamera(45, containerWidth / containerHeight, 0.1, 5000); // Giảm FOV một chút cho đỡ méo hình
    camera.position.set(60, 40, 110); // Đẩy camera ra xa hơn và cao hơn chút
    // camera.lookAt(0, 0, 0); // Sẽ được quản lý bởi OrbitControls target

    // --- Renderer Setup ---
    if (!renderer) {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true // Không cần alpha nếu đặt màu nền cho scene
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(containerWidth, containerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace; // Chính xác
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Bóng đổ mềm mại hơn
        renderer.toneMapping = THREE.ACESFilmicToneMapping; // Giúp màu sắc và độ sáng trông "điện ảnh" hơn
        renderer.toneMappingExposure = 1.1; // Tăng nhẹ độ sáng tổng thể

        carCanvasContainer.appendChild(renderer.domElement);
        console.log("Renderer canvas added to #car-canvas");
    } else {
        renderer.setSize(containerWidth, containerHeight);
        camera.aspect = containerWidth / containerHeight;
        camera.updateProjectionMatrix();
    }

    // --- Orbit Controls Setup ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08; // Giảm damping một chút
    controls.screenSpacePanning = false;
    controls.minDistance = 30; // Tăng khoảng cách tối thiểu
    controls.maxDistance = 250; // Tăng khoảng cách tối đa
    controls.maxPolarAngle = Math.PI / 2.1; // Hạn chế góc nhìn từ trên xuống quá thẳng
    // controls.target.set(0, 5, 0); // Sẽ cập nhật khi model load xong
    controls.autoRotate = true; // <<< TỰ ĐỘNG XOAY NHẸ
    controls.autoRotateSpeed = 0.5; // <<< Tốc độ xoay (âm để đổi chiều)
    controls.update();
    console.log("OrbitControls initialized.");


    // --- Lighting Setup (Tinh Chỉnh) ---

    // 1. Ambient Light: Cung cấp ánh sáng môi trường tổng thể, làm mềm các vùng tối.
    //    Giảm cường độ xuống một chút và có thể thêm màu nhẹ.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Ánh sáng trắng, cường độ vừa phải
    // Hoặc thử màu ấm hơn: const ambientLight = new THREE.AmbientLight(0xffeebb, 0.6);
    scene.add(ambientLight);

    // 2. Directional Light: Ánh sáng chính, tạo bóng đổ và highlights.
    //    Tăng cường độ, điều chỉnh vị trí và cải thiện chất lượng bóng đổ.
    const directionalLight = new THREE.DirectionalLight(0xffffff, 4.0); // Ánh sáng trắng, CƯỜNG ĐỘ CAO HƠN
    directionalLight.position.set(40, 50, 30); // Đặt vị trí cao và hơi lệch để tạo bóng đổ đẹp
    directionalLight.castShadow = true;

    // Cải thiện chất lượng bóng đổ
    directionalLight.shadow.mapSize.width = 2048; // Tăng độ phân giải bóng (cao hơn = nét hơn, nặng hơn)
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 10;      // Điều chỉnh khoảng cách gần của camera tạo bóng
    directionalLight.shadow.camera.far = 200;     // Điều chỉnh khoảng cách xa
    directionalLight.shadow.bias = -0.002;         // Giảm hiện tượng "shadow acne" (vệt sọc trên bề mặt nhận bóng)
    // Điều chỉnh kích thước vùng camera tạo bóng để vừa vặn với model hơn (quan trọng!)
    // Các giá trị này cần tinh chỉnh tùy theo kích thước và vị trí model
    const shadowCamSize = 50; // Kích thước vùng đổ bóng (đơn vị world)
    directionalLight.shadow.camera.left = -shadowCamSize;
    directionalLight.shadow.camera.right = shadowCamSize;
    directionalLight.shadow.camera.top = shadowCamSize;
    directionalLight.shadow.camera.bottom = -shadowCamSize;

    scene.add(directionalLight);

    // (Optional) Helper để xem hướng đèn và vùng đổ bóng (bỏ comment để bật)
    // const dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // scene.add(dirLightHelper);
    // const shadowCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(shadowCameraHelper);

    // --- GLTF Loader ---
    const loader = new GLTFLoader();
    loader.load(
        'scene.gltf', // Đảm bảo đường dẫn chính xác!
        function (gltf) { // Success
            console.log("GLTF model loaded successfully.");
            model = gltf.scene;

            // Bật castShadow và receiveShadow cho tất cả các mesh con
            model.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    // (Nâng cao - tùy chọn) Nếu biết vật liệu là gì, có thể tinh chỉnh thêm
                    // if (node.material && node.material.isMeshStandardMaterial) {
                    //     // Ví dụ: Làm cho kim loại phản chiếu mạnh hơn chút (nếu có)
                    //     // node.material.metalness = Math.min(node.material.metalness + 0.1, 1.0);
                    //     // Ví dụ: Giảm độ nhám để bóng hơn chút (cẩn thận)
                    //     // node.material.roughness = Math.max(node.material.roughness - 0.1, 0.0);
                    //     node.material.needsUpdate = true;
                    // }
                }
            });

            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());
            const center = bbox.getCenter(new THREE.Vector3());
            console.log("Model Bounding Box Size:", size);
            console.log("Model Bounding Box Center:", center);

            // (Quan trọng) Cập nhật tâm xoay của OrbitControls vào giữa model
            controls.target.copy(center);
            controls.update(); // Cập nhật lại controls sau khi đổi target

            // (Tùy chọn) Scale model nếu quá lớn/nhỏ
            const maxDim = Math.max(size.x, size.y, size.z);
            const desiredSize = 60; // Kích thước mong muốn lớn hơn một chút
            const scale = desiredSize / maxDim;
             if (scale < 100 && scale > 0.001 && !isNaN(scale)) { // Kiểm tra scale hợp lệ
                model.scale.set(scale, scale, scale);
                console.log("Model scaled by factor:", scale);
                // Tính lại bbox và center sau khi scale để target chính xác
                bbox.setFromObject(model).getCenter(center);
                controls.target.copy(center);
                controls.update();
                 // Cập nhật lại vùng đổ bóng của DirectionalLight cho vừa model sau scale
                const scaledSize = size.multiplyScalar(scale); // Kích thước mới sau scale
                const shadowCamSizeAdjusted = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) * 1.5; // Vùng bóng lớn hơn model chút
                 directionalLight.shadow.camera.left = -shadowCamSizeAdjusted / 2;
                 directionalLight.shadow.camera.right = shadowCamSizeAdjusted / 2;
                 directionalLight.shadow.camera.top = shadowCamSizeAdjusted / 2;
                 directionalLight.shadow.camera.bottom = -shadowCamSizeAdjusted / 2;
                 directionalLight.shadow.camera.updateProjectionMatrix(); // Cập nhật camera bóng đổ
                // if (shadowCameraHelper) shadowCameraHelper.update(); // Cập nhật helper nếu dùng

            } else {
                console.warn("Model scale factor invalid or extreme, skipping scaling. Scale:", scale);
            }


            scene.add(model);
            animate(); // Bắt đầu render loop sau khi model đã sẵn sàng
        },
        undefined, // Progress
        function (error) { // Error
            console.error('An error happened loading GLTF:', error);
            const errorDiv = document.createElement('div');
            errorDiv.textContent = `Error loading 3D model: ${error.message || 'Unknown error'}. Check console (F12). Is 'scene.gltf' in the correct path?`;
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '10px';
            errorDiv.style.border = '1px solid red';
            // errorDiv.style.background = 'rgba(255,0,0,0.1)';
            carCanvasContainer.appendChild(errorDiv);
        }
    );
    console.log("GLTF loading initiated...");
}

// Định nghĩa hàm animate (vòng lặp render)
function animate() {
    if (renderer && scene && camera) {
        requestAnimationFrame(animate);

        // Cập nhật OrbitControls (quan trọng cho damping và autoRotate)
        if (controls) {
            controls.update();
        }

        // (Optional) Cập nhật helpers nếu dùng
        // if (dirLightHelper) dirLightHelper.update();
        // if (shadowCameraHelper) shadowCameraHelper.update();

        renderer.render(scene, camera);
    }
}

// --- Code xử lý sự kiện DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded and parsed.");

    // --- Scroll Down Button ---
    const scrollDownBtn = document.getElementById("scroll-down");
    if (scrollDownBtn) {
        scrollDownBtn.addEventListener("click", function () {
            console.log("Scroll down button clicked!");
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        });
        console.log("Scroll down button event listener added.");
    } else {
        console.warn("Element with id 'scroll-down' not found.");
    }

    // --- Initialize Three.js ---
    console.log("Calling init() for Three.js setup...");
    try {
        init();
    } catch (e) {
        console.error("Error occurred during init() call:", e);
    }
});

const video1 = document.getElementById('projectVideo1');
const video2 = document.getElementById('projectVideo2');
const video3 = document.getElementById('projectVideo3');
const hoverSign = document.querySelector('.hoverSign');
const videoList = [video1, video2, video3];

videoList.forEach(function(video){
    video.playbackRate = 3.0  
    video.addEventListener('mouseover', function() {
        video.play();
        hoverSign.classList.add('active')
    });
    video.addEventListener('mouseout', function() {
        video.pause();
        hoverSign.classList.remove('active')
    });
})

// --- Xử lý Resize Cửa sổ ---
window.addEventListener('resize', () => {
    const carCanvasContainer = document.getElementById('car-canvas');
    if (camera && renderer && carCanvasContainer) {
        console.log("Window resized, updating renderer and camera...");
        const width = carCanvasContainer.clientWidth;
        const height = carCanvasContainer.clientHeight;

        if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
             // Cập nhật lại vùng đổ bóng khi resize nếu cần (ít quan trọng hơn)
             // const bbox = new THREE.Box3().setFromObject(model); // Cần model tồn tại
             // const size = bbox.getSize(new THREE.Vector3());
             // const shadowCamSizeAdjusted = Math.max(size.x, size.y, size.z) * 1.5;
             // directionalLight.shadow.camera.left = -shadowCamSizeAdjusted / 2;
             // directionalLight.shadow.camera.right = shadowCamSizeAdjusted / 2;
             // directionalLight.shadow.camera.top = shadowCamSizeAdjusted / 2;
             // directionalLight.shadow.camera.bottom = -shadowCamSizeAdjusted / 2;
             // directionalLight.shadow.camera.updateProjectionMatrix();
             // if (shadowCameraHelper) shadowCameraHelper.update();
        } else {
             console.warn("Resize event triggered but container has zero dimensions.");
        }
    }
});


