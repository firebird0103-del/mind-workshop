import {normalizeLamp} from './lamp-controls.js';
import {pickInteraction} from './interaction-picking.js';
import {applyBirdExplode} from './bird-assembly.js';
import {createLifePresentation} from './life-presentation.js';
import {createGramophoneAudio} from './gramophone-audio.js';
import {BLUEPRINTS} from './crafting.js';
import {WORK_ASSETS,createWorkPresentation} from './work-presentation.js';
import {SPATIAL_LAYOUT} from './spatial-layout.js';
import {catPositionClear} from './spatial-checks.js';
// 《心智大作戰：腦內工坊》GLB 資產主導完整 3D 美術重製版 (Three.js r160 + GLTFLoader + Skeletal AnimationMixer)
// 全場景建築、採光天窗、盤旋木梯、蒸氣發條升降塔、四間工作室家具與教具、中央機械小鳥與四組組裝部件、
// 八名骨骼蒙皮 Q 版工匠、兩隻動物夥伴、自然分枝樹木藤蔓與外部微縮工作桌世界，皆由離線製作之 50 組 GLB 資產載入驅動。

import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {PALETTE} from './palette.js';
import {
  WORKSHOP,
  STUDIOS,
  CENTRAL_WORKBENCH,
  STAIRS,
  ELEVATOR,
  DOORS,
  sampleStair
} from './layout.js';
import {
  panDelta,
  boundedPan,
  clampCameraAngle,
  clampCameraPolar,
  clampCameraDistance,
  computeCutawayOpacity
} from './navigation.js';
import {createWorkshopNavigation, createWorkshopTown} from './movement.js';
import {createResident, greetResident, residentStatus, talkResident} from './residents.js';
import {ANIMALS} from './animals.js';
import {AmbientChatter} from './chatter.js';
import {SoftwareRenderer} from './software-renderer.js';
import {RENDER_PROFILE, materialStyle} from './render-profile.js';
import {createOutdoorSky, deskLampLevel, outdoorPhase, skyState} from './room-environment.js';
import {createCatPatrol} from './cat-patrol.js';

const GLB_MANIFEST = {
  ...WORK_ASSETS,
  coffeeCorner:"assets/furniture/coffee_corner.glb",
  musicCorner:"assets/furniture/music_corner.glb",
  deliveryStations:"assets/equipment/delivery_stations.glb",
  // Architecture
  workshopShell: 'assets/architecture/workshop_shell.glb',
  skylightRoof: 'assets/architecture/skylight_roof.glb',
  grandStaircases: 'assets/architecture/grand_staircases.glb',
  elevatorTower: 'assets/architecture/elevator_tower.glb',
  atriumBalustrades: 'assets/architecture/atrium_balustrades.glb',
  // Furniture
  centralWorkbench: 'assets/furniture/central_workbench.glb',
  spatialFurniture: 'assets/furniture/spatial_furniture.glb',
  attentionFurniture: 'assets/furniture/attention_furniture.glb',
  memoryFurniture: 'assets/furniture/memory_furniture.glb',
  switchFurniture: 'assets/furniture/switch_furniture.glb',
  // Equipment & Props
  clockworkWallClock: 'assets/equipment/clockwork_wall_clock.glb',
  spatialInstruments: 'assets/equipment/spatial_instruments.glb',
  attentionInstruments: 'assets/equipment/attention_instruments.glb',
  memoryProps: 'assets/equipment/memory_props.glb',
  switchProps: 'assets/equipment/switch_props.glb',
  atriumProps: 'assets/equipment/atrium_props.glb',
  // Mechanical Songbird & 4 Component Trays
  mechanicalBird: 'assets/mechanical-bird/mechanical_bird.glb',
  trayCore: 'assets/mechanical-bird/tray_part_core.glb',
  trayWings: 'assets/mechanical-bird/tray_part_wings.glb',
  trayMelody: 'assets/mechanical-bird/tray_part_melody.glb',
  trayPlumage: 'assets/mechanical-bird/tray_part_plumage.glb',
  // 8 Rigged & Animated Chibi Artisans
  artisan0: 'assets/characters/artisan_0_xiaoshi.glb',
  artisan1: 'assets/characters/artisan_1_ajing.glb',
  artisan2: 'assets/characters/artisan_2_yaya.glb',
  artisan3: 'assets/characters/artisan_3_fangfang.glb',
  artisan4: 'assets/characters/artisan_4_xiaoyou.glb',
  artisan5: 'assets/characters/artisan_5_duoduo.glb',
  artisan6: 'assets/characters/artisan_6_diandian.glb',
  artisan7: 'assets/characters/artisan_7_yuanyuan.glb',
  // 2 Companion Animals
  catChestnut: 'assets/animals/cat_chestnut.glb',
  songbirdAzure: 'assets/animals/songbird_azure.glb',
  // Foliage
  indoorTree: 'assets/foliage/indoor_tree.glb',
  climbingVines: 'assets/foliage/climbing_vines.glb',
  pottedPlants: 'assets/foliage/potted_plants.glb',
  // External Miniature World
  craftsmanDesk: 'assets/surroundings/craftsman_desk.glb',
  foregroundProps: 'assets/surroundings/foreground_desk_props.glb',
  distantRoom: 'assets/surroundings/distant_workshop_room.glb'
};

export function createWorld(canvas, onSelectStudio, onSelectCenter, onReady, onError, worldOptions = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'high-performance'});
  } catch (e) {
    try {
      renderer = new SoftwareRenderer(canvas);
    } catch (err) {
      onError?.(err);
      return null;
    }
  }

  let isSwiftShader = false;
  let rendererUnmaskedName = 'SoftwareRenderer';
  if (!renderer.isSoftware) {
    try {
      const gl = renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      rendererUnmaskedName = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || 'WebGL';
      isSwiftShader = /swiftshader|llvmpipe|software|webkit webgl/i.test(String(rendererUnmaskedName));
    } catch {}
    renderer.setPixelRatio(
      isSwiftShader ? 1.0 : Math.min(window.devicePixelRatio || 1, window.innerWidth < 650 ? 1.35 : 1.7)
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = RENDER_PROFILE.exposure;
  } else {
    renderer.setPixelRatio(1.0);
  }

  const urlParams = new URLSearchParams(globalThis.location?.search || '');
  const isClayInspect = urlParams.get('inspectMode') === 'clay';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ddd0be');
  scene.fog = new THREE.FogExp2('#ddd0be', 0.0085);

  const camera = new THREE.PerspectiveCamera(28.5, 1, 0.2, 110);

  // Studio Softbox PMREM Environment Map for realistic brass, copper, glass & wood specular reflections
  if (!renderer.isSoftware && THREE.PMREMGenerator && !isClayInspect) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color('#cbb89e');
      const topBox = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshBasicMaterial({color: '#fff9ed', side: THREE.DoubleSide})
      );
      topBox.position.set(0, 15, 0);
      topBox.rotation.x = Math.PI / 2;
      envScene.add(topBox);

      const keyPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(24, 16),
        new THREE.MeshBasicMaterial({color: '#ffe2ad', side: THREE.DoubleSide})
      );
      keyPanel.position.set(-14, 7, 12);
      keyPanel.lookAt(0, 2, 0);
      envScene.add(keyPanel);

      const fillPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 16),
        new THREE.MeshBasicMaterial({color: '#d8e8f8', side: THREE.DoubleSide})
      );
      fillPanel.position.set(14, 7, 10);
      fillPanel.lookAt(0, 2, 0);
      envScene.add(fillPanel);

      const floorBounce = new THREE.Mesh(
        new THREE.PlaneGeometry(32, 32),
        new THREE.MeshBasicMaterial({color: '#8f6843', side: THREE.DoubleSide})
      );
      floorBounce.position.set(0, -10, 0);
      floorBounce.rotation.x = -Math.PI / 2;
      envScene.add(floorBounce);

      scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
    } catch {}
  }

  // Balanced 24-Hour Lighting Rig
  const hemi = new THREE.HemisphereLight(0xf9efdf, 0x705842, 0.84);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffefd8, 1.50);
  sun.position.set(-7.5, 14.5, 12.5);
  sun.castShadow = true;
  if (sun.shadow) {
    sun.shadow.mapSize.set(isSwiftShader ? 1024 : 2048, isSwiftShader ? 1024 : 2048);
    Object.assign(sun.shadow.camera, {left: -9.8, right: 9.8, top: 8.2, bottom: -5.5, near: 1.0, far: 42});
    sun.shadow.normalBias = 0.05;
    sun.shadow.bias = 0.0008;
  }
  scene.add(sun);

  const skyFill = new THREE.DirectionalLight(0xcce0f5, 0.38);
  skyFill.position.set(10, 8, 9);
  scene.add(skyFill);

  const warmAtriumLight = new THREE.PointLight(0xffb658, 0.92, 13.0);
  warmAtriumLight.position.set(0, 2.6, 0.9);
  scene.add(warmAtriumLight);

  const leftStudioLight = new THREE.PointLight(0xffb04c, 0.52, 8.0);
  leftStudioLight.position.set(-3.8, 2.5, 0.2);
  scene.add(leftStudioLight);

  const rightStudioLight = new THREE.PointLight(0xffb04c, 0.52, 8.0);
  rightStudioLight.position.set(3.8, 2.5, 0.2);
  scene.add(rightStudioLight);

  // The lamp's beam originates inside its tilted shade and points down towards the model.
  const deskLight = new THREE.SpotLight(0xffd095,0,28,0.78,0.70,2);
  deskLight.position.set(-8.8304,4.8996,-.7732);
  deskLight.target.position.set(-3.9,0.8,1.0);
  deskLight.castShadow = true;
  deskLight.shadow.mapSize.set(1024,1024);
  deskLight.shadow.bias=-0.00015;
  deskLight.shadow.normalBias=0.025;
  deskLight.shadow.camera.near=.15;
  deskLight.shadow.camera.far=28;
  scene.add(deskLight,deskLight.target);

  const world = new THREE.Group();
  scene.add(world);

  // Soft contact shadow texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d');
  const sGrad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 31);
  sGrad.addColorStop(0, 'rgba(38,28,20,0.48)');
  sGrad.addColorStop(0.5, 'rgba(38,28,20,0.22)');
  sGrad.addColorStop(1, 'rgba(38,28,20,0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 64, 64);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  function addContactShadow(parent, x, y, z, rx, rz, opacity = 0.36) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.MeshBasicMaterial({
        color: '#3a2e23',
        map: renderer.isSoftware ? null : shadowTex,
        transparent: true,
        opacity: renderer.isSoftware ? opacity * 0.42 : opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.scale.set(rx, rz, 1);
    parent.add(m);
    return m;
  }

  // The model sits on a craftsman's desk INSIDE a room. Daylight changes through windows;
  // celestial objects never float inside the room or in front of its walls.
  const envGroup = new THREE.Group();
  envGroup.name = 'Indoor_Desk_Environment';
  world.add(envGroup);
  let skyBackdropMat = new THREE.MeshBasicMaterial({color: '#e2d6c3'});
  const outdoorSky = createOutdoorSky(THREE);
  let deskLampBulbMaterial = null, lampRoot=null, lampHead=null, lampCallback=()=>{};
  let lampPitch=58,lampYaw=-12,lampPreview=false,lampOptions=normalizeLamp(),lampMoveMode=false,lampDrag=null,lampChangeCallback=()=>{};
  const lampPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.01);
  function lampPlanePoint(e){
    const b=canvas.getBoundingClientRect();
    const v=new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);
    const r=new THREE.Raycaster();r.setFromCamera(v,camera);
    return r.ray.intersectPlane(lampPlane,new THREE.Vector3());
  }
  function moveLampAt(e){
    const point=lampPlanePoint(e);if(!point||!lampDrag)return;
    lampOptions=normalizeLamp({...lampOptions,x:lampDrag.x+point.x-lampDrag.start.x,z:lampDrag.z+point.z-lampDrag.start.z});
    updateLamp();
  }
  function finishLampDrag(){if(lampDrag){lampDrag=null;lampChangeCallback({...lampOptions});}}

  function updateLamp(){
    if(lampRoot){lampRoot.position.set(lampOptions.x,.01,lampOptions.z);lampRoot.rotation.y=THREE.MathUtils.degToRad(lampOptions.heading);}
    if(lampHead){
      lampHead.rotation.set(0,THREE.MathUtils.degToRad(lampYaw),THREE.MathUtils.degToRad(lampPitch));
      lampHead.updateWorldMatrix(true,false);
      const source=lampHead.localToWorld(new THREE.Vector3(0,-.38,0));
      const axis=new THREE.Vector3(0,-1,0).transformDirection(lampHead.matrixWorld);
      deskLight.position.copy(source);deskLight.target.position.copy(source).addScaledVector(axis,8);
      deskLight.target.updateMatrixWorld();
    }
    const level=lampPreview?1:deskLampLevel(hour);
    deskLight.intensity=72*level*lampOptions.intensity/100;
    if(deskLampBulbMaterial){deskLampBulbMaterial.emissive.set('#ffd08a');deskLampBulbMaterial.emissiveIntensity=3.5*level*lampOptions.intensity/100;}
  }


  addContactShadow(envGroup, 0, 0.005, 0.35, 8.2, 4.4, 0.45);

  const cutawayMaterials = new Set();
  const lampBulbs = [];
  const windowPanes = [];

  // Shared PBR Texture & Material Pool across all 47 GLBs
  // Eliminates duplicate texture decodes & cuts shader compilation to < 0.4s
  const texLoader = new THREE.TextureLoader();
  const sharedTexSets = new Map();
  const sharedMatPool = new Map();
  const cutawayMatPool = new Map();
  const SHARED_PREFIXES = [
    'wood_walnut', 'wood_oak', 'wood_cherry', 'wood_desk',
    'plaster_cream', 'plaster_terracotta', 'plaster_honey', 'plaster_sage', 'plaster_lavender',
    'metal_brass', 'metal_copper', 'metal_iron',
    'rug_atrium'
  ];

  function loadTexPromise(url, colorSpace) {
    return new Promise((resolve, reject) => {
      texLoader.load(
        url,
        tex => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.colorSpace = colorSpace;
          tex.anisotropy = Math.min(4, renderer.capabilities?.getMaxAnisotropy?.() || 1);
          resolve(tex);
        },
        undefined,
        () => reject(new Error(`貼圖載入失敗：${url}`))
      );
    });
  }

  async function preloadAllSharedTextures() {
    if (renderer.isSoftware || isClayInspect) return;
    await Promise.all(
      SHARED_PREFIXES.map(async prefix => {
        const baseTex = await loadTexPromise(`assets/textures/${prefix}_basecolor.png`, THREE.SRGBColorSpace);
        let normTex = null;
        let ormTex = null;
        {
          [normTex, ormTex] = await Promise.all([
            loadTexPromise(`assets/textures/${prefix}_normal.png`, THREE.NoColorSpace),
            loadTexPromise(`assets/textures/${prefix}_orm.png`, THREE.NoColorSpace)
          ]);
        }
        sharedTexSets.set(prefix, {baseTex, normTex, ormTex});
      })
    );
  }

  function getSharedTexSet(prefix) {
    return sharedTexSets.get(prefix) || null;
  }

  const neutralClayMat = new THREE.MeshStandardMaterial({
    color: '#d8cfc2',
    roughness: 0.72,
    metalness: 0.04
  });

  function getPooledPBRMaterial(origMat) {
    if (!origMat) return origMat;
    if (isClayInspect) {
      const isGlass = origMat.transparent && origMat.opacity < 0.6;
      return isGlass ? origMat : neutralClayMat;
    }
    const prefix = origMat.userData?.texPrefix || '';
    const hasUniqueMap = !!origMat.map;
    if (hasUniqueMap && !prefix) {
      origMat.envMapIntensity = materialStyle('', origMat.metalness, origMat.roughness).envMapIntensity;
      return origMat;
    }
    const colHex = origMat.color ? origMat.color.getHexString() : 'ffffff';
    const emHex = origMat.emissive ? origMat.emissive.getHexString() : '000000';
    const key = [
      prefix,
      colHex,
      origMat.metalness?.toFixed(2),
      origMat.roughness?.toFixed(2),
      origMat.opacity?.toFixed(2),
      origMat.transparent ? 'T' : 'O',
      emHex,
      origMat.vertexColors ? 'VC' : 'NOVC'
    ].join('|');

    if (sharedMatPool.has(key)) return sharedMatPool.get(key);

    const tset = prefix ? getSharedTexSet(prefix) : null;
    const style = materialStyle(prefix, origMat.metalness, origMat.roughness);
    const mat = new THREE.MeshStandardMaterial({
      name: origMat.name,
      color: origMat.color ? origMat.color.clone() : new THREE.Color('#ffffff'),
      roughness: style.roughness,
      metalness: style.metalness,
      transparent: !!origMat.transparent,
      opacity: origMat.opacity ?? 1.0,
      depthWrite: !(origMat.transparent && (origMat.opacity ?? 1.0) < 0.85),
      side: origMat.side ?? THREE.FrontSide,
      vertexColors: !!origMat.vertexColors,
      emissive: origMat.emissive ? origMat.emissive.clone() : new THREE.Color('#000000'),
      emissiveIntensity: origMat.emissiveIntensity ?? 1.0,
      map: tset ? tset.baseTex : (origMat.map || null),
      normalMap: tset ? tset.normTex : null,
      normalScale: new THREE.Vector2(style.normalScale, style.normalScale),
      roughnessMap: tset ? tset.ormTex : null,
      metalnessMap: tset ? tset.ormTex : null,
      aoMap: tset ? tset.ormTex : null,
      aoMapIntensity: 0.65,
      envMapIntensity: style.envMapIntensity
    });
    sharedMatPool.set(key, mat);
    return mat;
  }

  function prepareLoadedGLB(rootObj) {
    rootObj.traverse(node => {
      if (node.isMesh && node.material) {
        node.material = getPooledPBRMaterial(node.material);
        const isTransparentGlass = node.material?.transparent && node.material?.opacity < 0.65;
        if (isTransparentGlass) {
          node.renderOrder = 2;
        }
        // Selective shadow casting & receiving: major structures/characters/bird cast shadows onto floors/tables/stairs,
        // preventing self-shadowing acne on vertical walls/faces and cutting shadow pass cost by 8x!
        const meshAndParentName = (node.name || '') + ' ' + (node.parent?.name || '');
        const isShadowCaster = /Cutaway_Shell|Skylight_Roof|Workbench_|Part_|Car_|Orrery_|WingPivot|Indoor_Tree|Artisan_|Desk_Lamp_(Hardware|Base|Toggle|Shade|Hinge)|Spatial_Furniture|Attention_Furniture|Memory_Furniture|Switch_Furniture/i.test(meshAndParentName);
        const isShadowReceiver = /Plinth_Base|Floor_2F|Grand_Staircases|Workbench_|Craftsman_Desk|Foreground_Desk_Props|Spatial_Furniture|Attention_Furniture|Memory_Furniture|Switch_Furniture/i.test(meshAndParentName);
        node.castShadow = !isTransparentGlass && isShadowCaster;
        node.receiveShadow = !isTransparentGlass && isShadowReceiver;
      }
    });

    rootObj.traverse(node => {
      if (node.userData?.cutaway) {
        node.traverse(child => {
          if (child.isMesh && child.material) {
            let cm = cutawayMatPool.get(child.material);
            if (!cm) {
              cm = child.material.clone();
              cm.userData={...cm.userData,cutawayBaseOpacity:child.material.opacity,
                cutawayBaseTransparent:child.material.transparent,cutawayBaseDepthWrite:child.material.depthWrite};
              cm.transparent = true;
              cutawayMatPool.set(child.material, cm);
              cutawayMaterials.add(cm);
            }
            child.material = cm;
          }
        });
      }
      if (node.userData?.lampBulb) {
        node.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.emissive = new THREE.Color('#ffbe50');
            child.material.emissiveIntensity = 1.1;
            lampBulbs.push(child);
          }
        });
      }
      if (node.userData?.windowGlow) {
        node.traverse(child => {
          if (child.isMesh && child.material && /Pane|Glow/i.test(child.material.name || '')) {
            child.material.emissive = new THREE.Color('#ffdd88');
            child.material.emissiveIntensity = 0.55;
            windowPanes.push(child);
          }
        });
      }
    });
    return rootObj;
  }

  // Interactive Groups & Raycast Proxies
  const hitMat = new THREE.MeshBasicMaterial({visible: false});

  const studioGroups = STUDIOS.map((st, idx) => {
    const g = new THREE.Group();
    g.userData.studio = idx;
    world.add(g);
    const w = st.bounds.x1 - st.bounds.x0;
    const d = st.bounds.z1 - st.bounds.z0;
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), hitMat);
    proxy.position.set((st.bounds.x0 + st.bounds.x1) * 0.5, st.y + 1.1, (st.bounds.z0 + st.bounds.z1) * 0.5);
    proxy.userData.interactionProxy=true;
    g.add(proxy);
    return g;
  });

  const centerGroup = new THREE.Group();
  centerGroup.position.set(CENTRAL_WORKBENCH.center[0], WORKSHOP.floor1Y, CENTRAL_WORKBENCH.center[2]);
  centerGroup.userData.centerWorkbench = true;
  world.add(centerGroup);

  const centerProxy = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 1.75, 18), hitMat);
  centerProxy.position.y = 0.88;
  centerProxy.userData.interactionProxy=true;
  centerGroup.add(centerProxy);

  const doorPivots = new Map();
  const stairGates = {left: null, right: null};
  const liftGates = {f1L: null, f1R: null, f2L: null, f2R: null};
  const cabinDoors = {L: null, R: null};
  let elevatorCabin = null;
  let shaftGears = [];
  let clockHands = {hourPivot: null, minutePivot: null};
  let clockGears = [];
  let spatialPolys = [];
  let lifePresentation=null;
  const gramophoneAudio=createGramophoneAudio(()=>!!town?.life.music.remaining&&!paused&&visible);
  let attentionMagnifier = null,componentTrayPads=null,carFollow=null;

  const centralBird = {
    root: new THREE.Group(),
    scaffold: null,
    parts: {core: null, wings: null, melody: null, plumage: null},
    leftWingPivot: null,
    rightWingPivot: null,
    lowerBeak: null,
    gears: []
  };
  centralBird.root.position.set(0, 0.59, 0);
  centerGroup.add(centralBird.root);

  const tabletopTrays = {
    core: new THREE.Group(),
    wings: new THREE.Group(),
    melody: new THREE.Group(),
    plumage: new THREE.Group()
  };
  tabletopTrays.core.position.set(-0.66, 0.615, 0.36);
  tabletopTrays.wings.position.set(0.66, 0.615, 0.36);
  tabletopTrays.melody.position.set(-0.60, 0.615, -0.44);
  tabletopTrays.plumage.position.set(0.60, 0.615, -0.44);
  for (const tg of Object.values(tabletopTrays)) {
    tg.visible = false;
    centerGroup.add(tg);
  }

  // 8 Residents & Navigation Setup
  const nav = createWorkshopNavigation();
  const transferMask=document.createElement('div');
  transferMask.id='sceneTransferMask';transferMask.className='scene-transfer-mask';
  transferMask.setAttribute('aria-hidden','true');transferMask.hidden=true;
  canvas.after(transferMask);
  const workPresentation=createWorkPresentation(centerGroup,tabletopTrays,text=>eventCallback(text),cover=>{
    transferMask.style.opacity=String(cover);transferMask.hidden=cover===0;
  });

  const residentModels = Array.from({length: 8}, (_, i) => {
    const r = createResident(i);
    const p = new THREE.Group();
    p.userData.resident = i;
    world.add(p);
    addContactShadow(p, 0, 0.015, 0, 0.24, 0.24, 0.36);
    const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hitMat);
    proxy.position.y = 0.42;
    p.add(proxy);
    return {
      r,
      p,
      mixer: null,
      actions: {},
      activeActionName: null,
      bones: {},
      cargo: null
    };
  });

  let animalAvoidance=()=>[];
  let resolvedResidentMode = worldOptions?.residentMode;
  if (!resolvedResidentMode) {
    try {
      const paramMode = new URLSearchParams(globalThis.location?.search || '').get('residentMode');
      if (paramMode === 'dynamic' || paramMode === 'classic') resolvedResidentMode = paramMode;
      else {
        const stored = JSON.parse(globalThis.localStorage?.getItem('brainWorkshop.v1.settings') || '{}');
        resolvedResidentMode = stored?.residentMode === 'dynamic' ? 'dynamic' : 'classic';
      }
    } catch {
      resolvedResidentMode = 'classic';
    }
  }
  const town = createWorkshopTown(
    residentModels.map(m => m.r),
    nav,
    {
      dynamicObstacles: () => animalAvoidance(),
      residentMode: resolvedResidentMode,
      getContext: () => ({
        workName: currentBlueprint?.name || '機械小鳥',
        installedCount: installedParts?.size || 0,
        animals: (typeof animalModels !== 'undefined' ? animalModels : []).map(a => ({
          index: a.index,
          floor: a.floor,
          p: [a.curPos?.[0] ?? a.center[0], a.curPos?.[2] ?? a.center[2]],
          state: a.patrolState || 'perch'
        }))
      })
    }
  );
  town.actors.forEach((a, i) => {
    residentModels[i].p.position.set(a.p[0], a.y, a.p[1]);
    residentModels[i].p.rotation.y = a.yaw;
  });

  // 2 Companion Animals Setup
  const animalModels = ANIMALS.map((data, index) => {
    const g = new THREE.Group();
    g.userData.animal = index;
    g.position.set(...data.center);
    world.add(g);
    if (index === 0) {
      addContactShadow(g, 0, 0.01, 0, 0.22, 0.28, 0.28);
    }
    const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hitMat);
    proxy.position.y = 0.26;
    g.add(proxy);
    return {
      ...data,
      index,
      g,
      mixer: null,
      wings: [],
      treat: null,
      curPos: [...data.center],
      reactPos: [...data.center],
      reactionUntil: 0,
      visits: 0,
      mood: '悠閒自在',
      status: data.routine
    };
  });

  const catConfig=SPATIAL_LAYOUT.cat;
  const catStudioPath=nav.nav1.route(nav.nav1.snap([catConfig.landing[0],catConfig.landing[2]]),nav.nav1.snap([catConfig.far[0],catConfig.far[2]])).map(([x,z])=>[x,WORKSHOP.floor1Y,z]);
  const catFrontPath=(catConfig.frontRoute||[[1.20,WORKSHOP.floor1Y,3.52],[0.60,WORKSHOP.floor1Y,3.66],[0.00,WORKSHOP.floor1Y,3.72],[-0.60,WORKSHOP.floor1Y,3.66],[-1.20,WORKSHOP.floor1Y,3.52]]).map(([x,y,z])=>[x,y??WORKSHOP.floor1Y,z]);
  const catPatrol=createCatPatrol(ANIMALS[0].center,catFrontPath,catConfig.speed,catConfig.jumpHeight,[catStudioPath]);
  animalAvoidance=()=>catPatrol.avoidance();

  function switchResidentClip(m, clipName, fadeDuration = 0.18) {
    if (!m.mixer || !m.actions[clipName] || m.activeActionName === clipName) return;
    const nextAction = m.actions[clipName];
    const prevAction = m.activeActionName ? m.actions[m.activeActionName] : null;
    nextAction.reset().play();
    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, fadeDuration, false);
    }
    m.activeActionName = clipName;
  }

  function updateAnimals(time, dt) {
    for (const a of animalModels) {
      if (a.mixer) a.mixer.update(dt);
      const airborne=a.index===0&&['descend','ascend'].includes(catPatrol.getState().state);
      const reacting=performance.now()<a.reactionUntil&&!airborne;
      if (a.treat) a.treat.visible = reacting && a.action === 'feed';
      if (a.index === 0) {
        if(reacting){
          const p=a.reactPos||a.curPos;a.g.position.set(...p);a.g.rotation.y=-.25+Math.sin(time*3)*.08;
          if(a.activeCatAction!=='Idle'&&a.actions?.Idle){a.actions.Walk?.fadeOut(.2);a.actions.Idle.reset().fadeIn(.2).play();a.activeCatAction='Idle';}
        }else{
          const pose=catPatrol.update(dt,(next,yaw)=>catPositionClear(next,yaw)&&town.actors.every(actor=>next[1]>=actor.y+.94||next[1]+.58<=actor.y||Math.hypot(actor.p[0]-next[0],actor.p[1]-next[2])>.70));
          a.curPos=pose.position;if(airborne)a.reactPos=[...pose.position];a.g.position.set(...pose.position);a.g.rotation.y=pose.yaw;
          a.g.rotation.z=pose.moving?Math.sin(time*9)*.022:0;
          const action=pose.moving?'Walk':'Idle';
          if(a.activeCatAction!==action&&a.actions?.[action]){
            a.actions[a.activeCatAction]?.fadeOut(.2);a.actions[action].reset().fadeIn(.2).play();a.activeCatAction=action;
          }
          a.patrolState=pose.state;
          const onFrontTerrace=pose.position[2]>3.0;
          a.status=pose.state==='rest'?'窩在木箱軟墊上休息':pose.state==='sniff'?(onFrontTerrace?'在中央圓桌與材料推車前停下腳步，好奇地聞聞齒輪與木香':'在工作室前方停下腳步，好奇地聞聞工具與木香'):(onFrontTerrace?'沿著中央圓桌前方的弧形木露臺悠閒散步':'沿著一樓工作室內側走道散步，巡視材料桌與收納櫃');
          a.mood=pose.state==='rest'?'呼嚕休息':pose.state==='sniff'?'好奇探索':'悠閒散步';
        }
      } else {
        const hop = reacting ? Math.abs(Math.sin(time * 9)) * 0.12 : Math.max(0, Math.sin(time * 3.2)) * 0.03;
        const z = a.center[2] + Math.sin(time * 1.1) * 0.06;
        a.curPos = [a.center[0], a.center[1] + hop, z];
        a.g.position.set(...a.curPos);
        a.g.rotation.y = -Math.PI / 2 + Math.sin(time * 1.8) * 0.25;
        a.wings.forEach((w, k) => {
          w.rotation.z = (k === 0 ? -1 : 1) * (reacting ? Math.abs(Math.sin(time * 16)) * 0.65 : Math.sin(time * 3) * 0.08);
        });
      }
    }
  }

  function interactAnimal(index, action = 'pet') {
    const a = animalModels[index];
    if (!a) return null;
    a.visits++;
    a.action = action;
    if (a.treat) a.treat.visible = action === 'feed';
    a.reactPos = [...(a.curPos || a.center)];
    a.reactionUntil = performance.now() + 4500;
    a.mood = action === 'feed' ? '心滿意足' : '開心回應';
    a.status = action === 'feed'
      ? ['聞了聞小魚餅乾，開心地搖搖尾巴！', '低頭啄起香脆穀粒，清脆地啾啾兩聲！'][index]
      : ['呼嚕呼嚕～開心地抬起頭蹭蹭你的手。', '拍拍藍色翅膀，在窗臺木棲架上跳了兩下向你問好！'][index];
    return {
      text: a.status,
      mood: a.mood,
      emote: action === 'feed' ? '✦' : '♥'
    };
  }

  // Load All 50 GLB Assets via GLTFLoader
  const loader = new GLTFLoader();
  let assetsReady = false;
  const loadedStats = {
    glbCount: 0,
    meshCount: 0,
    triangleCount: 0,
    skinnedMeshCount: 0,
    animationClipCount: 0,
    pooledMaterialCount: 0,
    sharedTextureSetCount: 0
  };

  function loadGLB(url) {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        gltf => resolve(gltf),
        undefined,
        err => reject(new Error(`GLB 資產載入失敗 (${url}): ${err?.message || err}`))
      );
    });
  }

  preloadAllSharedTextures().then(() => Promise.all(
    Object.entries(GLB_MANIFEST).map(async ([key, url]) => {
      const gltf = await loadGLB(url);
      prepareLoadedGLB(gltf.scene);
      loadedStats.glbCount++;
      loadedStats.animationClipCount += (gltf.animations || []).length;
      gltf.scene.traverse(obj => {
        if (obj.isMesh) {
          loadedStats.meshCount++;
          if (obj.isSkinnedMesh) loadedStats.skinnedMeshCount++;
          const idx = obj.geometry?.index;
          const pos = obj.geometry?.attributes?.position;
          loadedStats.triangleCount += idx ? idx.count / 3 : pos ? pos.count / 3 : 0;
        }
      });
      return [key, gltf];
    })
  ))
    .then(entries => {
      const map = Object.fromEntries(entries);
      loadedStats.pooledMaterialCount = sharedMatPool.size;
      loadedStats.sharedTextureSetCount = sharedTexSets.size;

      // 1. Mount External Miniature World (`surroundings/`)
      envGroup.add(map.craftsmanDesk.scene);
      envGroup.add(map.foregroundProps.scene);
      envGroup.add(map.distantRoom.scene);
      const outdoorNode = map.distantRoom.scene.getObjectByName('Outdoor_Window_View');
      outdoorNode?.traverse(node => {
        if(node.isMesh) node.material = new THREE.MeshBasicMaterial({map:outdoorSky.texture,side:THREE.DoubleSide,toneMapped:false,fog:false});
      });
      lampRoot=map.foregroundProps.scene.getObjectByName('Desk_Lamp_Root');
      lampHead=map.foregroundProps.scene.getObjectByName('Desk_Lamp_Head_Pivot');
      if(lampRoot)lampRoot.userData.deskLamp=true;
      const lampBulbNode = map.foregroundProps.scene.getObjectByName('Desk_Lamp_Bulb');
      lampBulbNode?.traverse(node => {if(node.isMesh)deskLampBulbMaterial=node.material;});
      const skyNode = map.distantRoom.scene.getObjectByName('Room_Interior_Walls');
      if (skyNode) {
        skyNode.traverse(c => {
          if (c.isMesh && c.material) skyBackdropMat = c.material;
        });
      }

      // 2. Mount Architecture (`architecture/`)
      world.add(map.workshopShell.scene);
      world.add(map.skylightRoof.scene);

      world.add(map.grandStaircases.scene);
      stairGates.left = map.grandStaircases.scene.getObjectByName('StairGate_Left');
      stairGates.right = map.grandStaircases.scene.getObjectByName('StairGate_Right');

      world.add(map.elevatorTower.scene);
      elevatorCabin = map.elevatorTower.scene.getObjectByName('Elevator_Cabin');
      cabinDoors.L = map.elevatorTower.scene.getObjectByName('CabinDoor_L');
      cabinDoors.R = map.elevatorTower.scene.getObjectByName('CabinDoor_R');
      liftGates.f1L = map.elevatorTower.scene.getObjectByName('LiftGate_f1L');
      liftGates.f1R = map.elevatorTower.scene.getObjectByName('LiftGate_f1R');
      liftGates.f2L = map.elevatorTower.scene.getObjectByName('LiftGate_f2L');
      liftGates.f2R = map.elevatorTower.scene.getObjectByName('LiftGate_f2R');
      shaftGears = [
        map.elevatorTower.scene.getObjectByName('ShaftGear_1'),
        map.elevatorTower.scene.getObjectByName('ShaftGear_2'),
        map.elevatorTower.scene.getObjectByName('ShaftGear_3'),
        map.elevatorTower.scene.getObjectByName('ShaftGear_Top')
      ].filter(Boolean);

      world.add(map.atriumBalustrades.scene);
      for (const d of DOORS) {
        const dp = map.atriumBalustrades.scene.getObjectByName(`DoorPivot_${d.id}`);
        if (dp) doorPivots.set(d.id, dp);
      }

      // 3. Mount Furniture & Equipment (`furniture/` & `equipment/`)
      world.add(map.centralWorkbench.scene);
      componentTrayPads=map.centralWorkbench.scene.getObjectByName("Component_Tray_Pads");
      map.centralWorkbench.scene.traverse(c => {
        c.userData.centerWorkbench = true;
      });
      world.add(map.atriumProps.scene);
      world.add(map.coffeeCorner.scene);
      world.add(map.musicCorner.scene);
      world.add(map.deliveryStations.scene);

      studioGroups[0].add(map.spatialFurniture.scene);
      studioGroups[0].add(map.clockworkWallClock.scene);
      studioGroups[0].add(map.spatialInstruments.scene);
      clockHands.hourPivot = map.clockworkWallClock.scene.getObjectByName('Clock_HourHand');
      clockHands.minutePivot = map.clockworkWallClock.scene.getObjectByName('Clock_MinuteHand');
      clockGears = [
        map.clockworkWallClock.scene.getObjectByName('ClockGear_1'),
        map.clockworkWallClock.scene.getObjectByName('ClockGear_2'),
        map.clockworkWallClock.scene.getObjectByName('ClockGear_Wall')
      ].filter(Boolean);
      spatialPolys = [
        map.spatialInstruments.scene.getObjectByName('Poly_1'),
        map.spatialInstruments.scene.getObjectByName('Poly_2'),
        map.spatialInstruments.scene.getObjectByName('Poly_3')
      ].filter(Boolean);

      studioGroups[1].add(map.attentionFurniture.scene);
      studioGroups[1].add(map.attentionInstruments.scene);
      attentionMagnifier = map.attentionInstruments.scene.getObjectByName('Magnifier_Lens_Head');

      studioGroups[2].add(map.memoryFurniture.scene);
      studioGroups[2].add(map.memoryProps.scene);
      studioGroups[2].add(map.indoorTree.scene);

      studioGroups[3].add(map.switchFurniture.scene);
      studioGroups[3].add(map.switchProps.scene);

      // 4. Mount Foliage (`foliage/`)
      world.add(map.climbingVines.scene);
      world.add(map.pottedPlants.scene);

      // 5. Mount Mechanical Songbird & 4 Component Trays (`mechanical-bird/`)
      const birdScene = map.mechanicalBird.scene;
      centralBird.root.add(birdScene);
      centralBird.scaffold = birdScene.getObjectByName('Scaffold');
      centralBird.parts.core = birdScene.getObjectByName('Part_Core');
      centralBird.parts.wings = birdScene.getObjectByName('Part_Wings');
      centralBird.parts.melody = birdScene.getObjectByName('Part_Melody');
      centralBird.parts.plumage = birdScene.getObjectByName('Part_Plumage');
      centralBird.leftWingPivot = birdScene.getObjectByName('WingPivot_Left');
      centralBird.rightWingPivot = birdScene.getObjectByName('WingPivot_Right');
      centralBird.lowerBeak = birdScene.getObjectByName('Lower_Beak');
      centralBird.gears = [
        birdScene.getObjectByName('BirdGear_Left_Main'),
        birdScene.getObjectByName('BirdGear_Left_Sub'),
        birdScene.getObjectByName('BirdGear_Right_Main'),
        birdScene.getObjectByName('BirdGear_Right_Sub')
      ].filter(Boolean);

      tabletopTrays.core.add(map.trayCore.scene);
      tabletopTrays.wings.add(map.trayWings.scene);
      tabletopTrays.melody.add(map.trayMelody.scene);
      tabletopTrays.plumage.add(map.trayPlumage.scene);

      workPresentation.mount(map);

      // 6. Mount 8 Rigged & Animated Chibi Artisans (`characters/`)
      for (let i = 0; i < 8; i++) {
        const gltf = map[`artisan${i}`];
        const m = residentModels[i];
        gltf.scene.scale.setScalar(0.78);
        m.p.add(gltf.scene);
        m.cargo = gltf.scene.getObjectByName('Cargo_Crate');
        if(m.cargo)m.cargo.visible=false;
        m.bones = {
          hips: gltf.scene.getObjectByName('Root_Hips'),
          chest: gltf.scene.getObjectByName('Spine_Chest'),
          head: gltf.scene.getObjectByName('Neck_Head'),
          armL: gltf.scene.getObjectByName('Arm_L'),
          armR: gltf.scene.getObjectByName('Arm_R'),
          forearmL:gltf.scene.getObjectByName('Forearm_L'),
          forearmR:gltf.scene.getObjectByName('Forearm_R'),
          kneeL:gltf.scene.getObjectByName('Knee_L'),
          kneeR:gltf.scene.getObjectByName('Knee_R'),
          legL: gltf.scene.getObjectByName('Leg_L'),
          legR: gltf.scene.getObjectByName('Leg_R')
        };
        if (gltf.animations && gltf.animations.length > 0) {
          m.mixer = new THREE.AnimationMixer(gltf.scene);
          for (const clip of gltf.animations) {
            m.actions[clip.name] = m.mixer.clipAction(clip);
          }
          switchResidentClip(m, 'Idle', 0);
          m.mixer.update(i * 0.43);
        }
      }

      // 7. Mount 2 Companion Animals (`animals/`)
      const catGltf = map.catChestnut;
      animalModels[0].g.add(catGltf.scene);
      animalModels[0].treat = catGltf.scene.getObjectByName('Treat_Group');
      if (animalModels[0].treat) animalModels[0].treat.visible = false;
      if (catGltf.animations?.length) {
        animalModels[0].mixer = new THREE.AnimationMixer(catGltf.scene);
        animalModels[0].actions=Object.fromEntries(catGltf.animations.map(clip=>[clip.name,animalModels[0].mixer.clipAction(clip)]));
        animalModels[0].actions.Idle.play();animalModels[0].activeCatAction='Idle';
      }

      const birdGltf = map.songbirdAzure;
      animalModels[1].g.add(birdGltf.scene);
      animalModels[1].treat = birdGltf.scene.getObjectByName('Treat_Group');
      if (animalModels[1].treat) animalModels[1].treat.visible = false;
      animalModels[1].wings = [
        birdGltf.scene.getObjectByName('Wing_L'),
        birdGltf.scene.getObjectByName('Wing_R')
      ].filter(Boolean);

      lifePresentation=createLifePresentation(map,residentModels,town);
      assetsReady = true;
      updateResidents(0);
      syncBirdParts();
      setHour(hour);
      renderNow();
      resume();
      onReady?.();
    })
    .catch(err => {
      console.error(err);
      onError?.(err);
    });

  // ============================================================================
  // CAMERA, 24-HOUR FLOWING ENVIRONMENT, CUTAWAY FADING & INTERACTION LOOP
  // ============================================================================
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDown = null,
    dragging = false,
    lastPointer = null,
    touches = new Map(),
    pinchDistance = 0,
    pinchCenter = null,
    gesture = false,
    panMode = false,
    viewingMode = false,
    hoverAt = 0;

  let atHome = true;
  let angle = 0.0;
  let polar = 0.27;
  let distance = 18.8;
  const target = new THREE.Vector3(0, 2.42, 0.25);
  let fly = null;
  let activeStudio = -1;
  let cutawayEnabled = true;

  let paused = false,
    visible = true,
    raf = 0,
    simTime = 0,
    lastTime = performance.now(),
    hour = 11.0,
    autoDay = true;

  let currentBlueprint=BLUEPRINTS[0];
  let installedParts = new Set();
  let pendingDelivery = null;
  let collectedCount = 0;
  let liftDoorAngle1F = 0;
  let liftDoorAngle2F = 0;
  let cabinDoorAngle = 0;
  let birdFlight = null;
  let birdSpin = null;
  let birdChirp = null;
  let birdExploded = false;
  let explodeProgress = 0;
  let craftingShowcase = null;

  let labelCallback = () => {},
    clockCallback = () => {},
    eventCallback = () => {},
    residentCallback = () => {},
    speechCallback = () => {},
    bubbleCallback = () => {},
    animalCallback = () => {},
    gestureCallback = () => {},
    craftAnimCallback = () => {};

  const speeches = new Map();
  let speechTimer;
  let ambientGate = () => true;
  let chatterSeed = 7319;
  const chatterRandom = () => {
    let t = (chatterSeed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const chatter = new AmbientChatter(chatterRandom, performance.now());

  function homeDistance() {
    const w = canvas.clientWidth || 1000;
    const h = canvas.clientHeight || 650;
    const aspect = w / h;
    return aspect < 1.25 ? Math.min(80, 25.5 * (1.55 / aspect)) : 25.5;
  }

  function updateCutawayMaterials() {
    const op = computeCutawayOpacity(distance, polar, cutawayEnabled);
    for (const m of cutawayMaterials) {
      m.opacity = (m.userData.cutawayBaseOpacity ?? 1)*op;
      m.transparent = !!m.userData.cutawayBaseTransparent || op<0.995;
      m.depthWrite = (m.userData.cutawayBaseDepthWrite ?? true) && !m.transparent;
      m.visible = op > 0.08;
    }
  }

  function updateCamera() {
    angle = clampCameraAngle(angle);
    polar = clampCameraPolar(polar);
    distance = clampCameraDistance(distance);
    camera.position.set(
      target.x + distance * Math.sin(angle) * Math.cos(polar),
      target.y + distance * Math.sin(polar),
      target.z + distance * Math.cos(angle) * Math.cos(polar)
    );
    camera.lookAt(target);
    updateCutawayMaterials();
    canvas.dataset.view = JSON.stringify({
      angle: +angle.toFixed(3),
      polar: +polar.toFixed(3),
      distance: +distance.toFixed(2),
      target: target.toArray().map(v => +v.toFixed(2))
    });
  }

  function syncBirdParts() {
    const effectiveParts = new Set([...installedParts].filter(id => id !== pendingDelivery?.partId));
    const allFourReady = effectiveParts.size >= 4;
    workPresentation.sync(currentBlueprint.id,effectiveParts);
    if(componentTrayPads)componentTrayPads.visible=!allFourReady;
    centralBird.root.visible=currentBlueprint.id==='mechanical-bird';
    for(const group of Object.values(tabletopTrays))for(const child of group.children){
      if(!child.userData.workBlueprint)child.visible=currentBlueprint.id==='mechanical-bird';
    }
    if (!allFourReady || currentBlueprint.id!=='mechanical-bird') {
      birdFlight = null;
      birdSpin = null;
      birdChirp = null;
      birdExploded = false;
      explodeProgress = 0;
      applyBirdExplode(centralBird,0);
      centralBird.root.position.set(0, 0.59, 0);
      centralBird.root.rotation.set(0, 0, 0);
      if (centralBird.leftWingPivot) centralBird.leftWingPivot.rotation.z = 0;
      if (centralBird.rightWingPivot) centralBird.rightWingPivot.rotation.z = 0;
    }

    for (const [partKey, group] of Object.entries(centralBird.parts)) {
      if (group) group.visible = allFourReady;
    }
    for (const [partKey, trayGroup] of Object.entries(tabletopTrays)) {
      if (trayGroup) trayGroup.visible = !allFourReady && effectiveParts.has(partKey);
    }
  }

  function dismissSpeech(key) {
    chatter.defer(performance.now(), 5000);
    if (key) speeches.delete(key);
    else speeches.clear();
    renderNow();
  }

  function dismissOnDrag() {
    chatter.defer(performance.now(), 4000);
    speeches.clear();
    gestureCallback();
  }

  function say(kind, index, response, interactive = false) {
    const key = kind + index;
    const actor = kind === 'resident' ? residentModels[index].r : animalModels[index];
    speeches.set(key, {
      key,
      kind,
      index,
      name: actor.name,
      ...response,
      interactive,
      until: performance.now() + (interactive ? 4800 : 3100)
    });
    if (interactive) {
      chatter.defer(performance.now(), 6000);
      speechCallback({kind, index, name: actor.name, ...response});
    }
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => {
      if (paused) renderNow();
    }, interactive ? 4850 : 3150);
    if (interactive || paused) renderNow();
  }

  function talk(index, action = 'hello') {
    const m = residentModels[index];
    if (!m) return;
    const response = talkResident(m.r, action, hour, installedParts.size);
    if(!town.actors[index].life){m.p.rotation.y = Math.atan2(camera.position.x - m.p.position.x, camera.position.z - m.p.position.z);switchResidentClip(m, 'Wave', 0.12);}
    say('resident', index, response, true);
    residentCallback({...m.r, floor: town.actors[index].floor, status: residentStatus(m.r)});
  }

  function visitAnimal(index) {
    const a = animalModels[index];
    if (!a) return;
    a.g.rotation.y = Math.atan2(camera.position.x - a.g.position.x, camera.position.z - a.g.position.z);
    move(a.g.position.clone().add(new THREE.Vector3(0, 0.35, 0)), 9.5, clampCameraAngle(angle * 0.5), 0.36);
    animalCallback({
      name: a.name,
      species: a.species,
      icon: a.icon,
      home: a.home,
      routine: a.routine,
      floor: a.floor,
      index: a.index,
      mood: a.mood,
      status: a.status
    });
    say('animal', index, interactAnimal(index, 'pet'), true);
  }

  function pick(e) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((e.clientY - bounds.top) / bounds.height) * 2 + 1
    );
    if(viewingMode)return null;
    ray.setFromCamera(pointer, camera);
    const targets = [
      ...residentModels.map(m => m.p),
      ...animalModels.map(a => a.g),
      centerGroup,
      ...(lampRoot?[lampRoot]:[]),
      ...studioGroups
    ];
    return pickInteraction(ray,targets);
  }

  function pan(dx, dy) {
    const delta = panDelta(dx, dy, distance, canvas.clientHeight, camera.fov, angle, polar);
    const next = boundedPan(target, delta);
    target.set(next.x, next.y, next.z);
  }

  function touchPair() {
    const a = [...touches.values()];
    return {
      center: [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2],
      distance: Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1])
    };
  }

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && ![0, 1, 2].includes(e.button)) return;
    e.preventDefault();
    canvas.focus({preventScroll: true});
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    fly = null;
    atHome = false;
    if (touches.size === 1) {
      pointerDown = [e.clientX, e.clientY];
      lastPointer = [e.clientX, e.clientY];
      dragging = false;
      gesture = false;
      canvas.dataset.dragPan = String(panMode || e.button === 2 || e.button === 1);
      const hit=pick(e),point=lampPlanePoint(e);
      if(!viewingMode&&e.button===0&&!panMode&&point&&(hit?.userData.deskLamp||lampMoveMode)){
        lampDrag={id:e.pointerId,start:point,x:lampOptions.x,z:lampOptions.z};
      }
    } else {
      finishLampDrag();
      gesture = true;
      dragging = true;
      const pair = touchPair();
      pinchDistance = pair.distance;
      pinchCenter = pair.center;
      dismissOnDrag();
    }
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) {
      if (performance.now() - hoverAt > 120) {
        hoverAt = performance.now();
        canvas.style.cursor = lampMoveMode?'move':pick(e) ? 'pointer' : panMode ? 'move' : 'grab';
      }
      return;
    }
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size >= 2) {
      const pair = touchPair();
      if (pinchCenter) pan(pair.center[0] - pinchCenter[0], pair.center[1] - pinchCenter[1]);
      if (pinchDistance && pair.distance > 5) {
        distance = clampCameraDistance((distance * pinchDistance) / pair.distance);
      }
      pinchDistance = pair.distance;
      pinchCenter = pair.center;
    } else if (lastPointer) {
      if (!dragging && Math.hypot(e.clientX - pointerDown[0], e.clientY - pointerDown[1]) > 6) {
        dragging = true;
        dismissOnDrag();
      }
      if (dragging) {
        const dx = e.clientX - lastPointer[0];
        const dy = e.clientY - lastPointer[1];
        if(lampDrag){moveLampAt(e);}
        else if (canvas.dataset.dragPan === 'true' || gesture) {
          pan(dx, dy);
        } else {
          angle = clampCameraAngle(angle - dx * 0.0075);
          polar = clampCameraPolar(polar + dy * 0.0055);
        }
      }
    }
    lastPointer = [e.clientX, e.clientY];
    renderNow();
  });

  function endPointer(e) {
    if (!touches.has(e.pointerId)) return;
    touches.delete(e.pointerId);
    if(lampMoveMode&&lampDrag&&!dragging){
      const point=lampPlanePoint(e);
      if(point){lampOptions=normalizeLamp({...lampOptions,x:point.x,z:point.z});updateLamp();}
      dragging=true;
    }
    finishLampDrag();
    if (!viewingMode && !dragging && !gesture && e.button === 0 && pointerDown && Math.hypot(e.clientX - pointerDown[0], e.clientY - pointerDown[1]) <= 6) {
      const o = pick(e);
      if (!o) {
        dismissSpeech();
        gestureCallback();
      } else if (Number.isInteger(o.userData.animal)) {
        visitAnimal(o.userData.animal);
      } else if (Number.isInteger(o.userData.resident)) {
        talk(o.userData.resident);
      } else if (o.userData.deskLamp) {
        lampCallback();
      } else if (o.userData.centerWorkbench) {
        dismissSpeech();
        focusWorkbench();
        onSelectCenter?.();
      } else if (Number.isInteger(o.userData.studio)) {
        dismissSpeech();
        onSelectStudio?.(o.userData.studio);
      }
    }
    if (touches.size) {
      lastPointer = [...touches.values()][0];
      gesture = true;
      dragging = true;
    } else {
      pointerDown = null;
      lastPointer = null;
      gesture = false;
      dragging = false;
      canvas.style.cursor = panMode ? 'move' : 'grab';
    }
    pinchDistance = 0;
    pinchCenter = null;
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', () => {
    finishLampDrag();
    touches.clear();
    pointerDown = null;
    lastPointer = null;
    pinchDistance = 0;
    pinchCenter = null;
    gesture = false;
    dragging = false;
    canvas.style.cursor = panMode ? 'move' : 'grab';
  });

  canvas.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      fly = null;
      atHome = false;
      dismissOnDrag();
      distance = clampCameraDistance(distance * Math.exp(e.deltaY * 0.001));
      renderNow();
    },
    {passive: false}
  );

  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-'].includes(e.key)) return;
    e.preventDefault();
    fly = null;
    atHome = false;
    dismissOnDrag();
    if (e.shiftKey || panMode) {
      pan(
        e.key === 'ArrowLeft' ? 35 : e.key === 'ArrowRight' ? -35 : 0,
        e.key === 'ArrowUp' ? 35 : e.key === 'ArrowDown' ? -35 : 0
      );
    } else {
      if (e.key === 'ArrowLeft') angle = clampCameraAngle(angle - 0.12);
      if (e.key === 'ArrowRight') angle = clampCameraAngle(angle + 0.12);
      if (e.key === 'ArrowUp') polar = clampCameraPolar(polar + 0.08);
      if (e.key === 'ArrowDown') polar = clampCameraPolar(polar - 0.08);
    }
    if (e.key === '+') distance = clampCameraDistance(distance - 1.8);
    if (e.key === '-') distance = clampCameraDistance(distance + 1.8);
    renderNow();
  });

  // 24-Hour Continuous Environment & Lighting Controller
  function setHour(h) {
    hour = ((h % 24) + 24) % 24;
    renderer.hour = hour;
    outdoorSky.update(hour,simTime);
    updateLamp();

    const dayAngle = ((hour - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(dayAngle);
    const nightFactor = THREE.MathUtils.clamp((0.15 - sunElev) / 0.85, 0, 1);
    const duskFactor = Math.max(0, 1 - Math.abs(sunElev - 0.05) * 3.2);

    const daySky = new THREE.Color('#ddd0be');
    const duskSky = new THREE.Color('#c79672');
    const nightSky = new THREE.Color('#55505a');
    const curSky = daySky.clone().lerp(duskSky, duskFactor * 0.75).lerp(nightSky, nightFactor);
    scene.background.copy(curSky);
    scene.fog.color.copy(curSky);

    const winDay = new THREE.Color('#d2c7b6');
    const winDusk = new THREE.Color('#bca58e');
    const winNight = new THREE.Color('#625e63');
    if (skyBackdropMat?.color) {
      skyBackdropMat.color.copy(winDay).lerp(winDusk, duskFactor * 0.82).lerp(winNight, nightFactor);
    }

    sun.position.set(-Math.cos(dayAngle) * 11.0, Math.max(4.5, 14.0 - nightFactor * 6.5), 12.5);
    sun.intensity = 1.50 * (1 - nightFactor * 0.82);
    sun.color.setHex(duskFactor > 0.35 ? 0xffc58a : nightFactor > 0.5 ? 0x7090c8 : 0xffefd8);
    hemi.color.setHex(nightFactor > 0.5 ? 0x6278a4 : 0xfff6e8);
    hemi.groundColor.setHex(nightFactor > 0.5 ? 0x2a2422 : 0x7a5c43);
    hemi.intensity = 0.84 - nightFactor * 0.32;
    skyFill.intensity = 0.38 - nightFactor * 0.26;

    warmAtriumLight.intensity = 0.96 + nightFactor * 1.65 + duskFactor * 0.55;
    leftStudioLight.intensity = 0.58 + nightFactor * 1.35 + duskFactor * 0.45;
    rightStudioLight.intensity = 0.58 + nightFactor * 1.35 + duskFactor * 0.45;

    lampBulbs.forEach(b => {
      if (b.material) b.material.emissiveIntensity = 0.95 + nightFactor * 1.55 + duskFactor * 0.45;
    });
    windowPanes.forEach(wp => {
      if (wp.material) {
        wp.material.emissiveIntensity = 0.45 * (1 - nightFactor) + 0.04;
        wp.material.color.set(nightFactor > 0.5 ? '#8b9eaf' : '#fff3d8');
      }
    });

    if (clockHands.hourPivot && clockHands.minutePivot) {
      clockHands.hourPivot.rotation.z = -((hour % 12) / 12) * Math.PI * 2;
      clockHands.minutePivot.rotation.z = -(hour % 1) * Math.PI * 2;
    }

    let phase = 'day',
      icon = '☀',
      label = '日光工作室',
      skyCenter = '#e6dac8',
      skyEdge = '#bfb09b';
    if (hour >= 5 && hour < 8) {
      phase = 'dawn';
      icon = '🌅';
      label = '晨光入室';
      skyCenter = '#ead6c2';
      skyEdge = '#bf9f88';
    } else if (hour >= 17 && hour < 20) {
      phase = 'dusk';
      icon = '🌇';
      label = '傍晚暖燈';
      skyCenter = '#cfa482';
      skyEdge = '#7d5a4b';
    } else if (hour >= 20 || hour < 5) {
      phase = 'night';
      icon = '🌙';
      label = '夜間工作燈';
      skyCenter = '#3b4359';
      skyEdge = '#1e2330';
    }
    clockCallback(hour, {phase, icon, label, skyCenter, skyEdge});
  }

  function draw() {
    renderer.render(scene, camera);
    const now = performance.now();
    const bubbles = [];
    for (const [key, b] of speeches) {
      if (now > b.until) {
        speeches.delete(key);
        continue;
      }
      let p;
      if (b.kind === 'resident') {
        const m = residentModels[b.index];
        if (m.bones?.head) {
          m.p.updateMatrixWorld(true);
          p = m.bones.head.getWorldPosition(new THREE.Vector3());
          p.y += 0.42;
        } else {
          p = m.p.position.clone();
          p.y += 0.84;
        }
      } else {
        p = animalModels[b.index].g.position.clone();
        p.y += 0.55;
      }
      p.project(camera);
      bubbles.push({
        ...b,
        x: ((p.x + 1) * canvas.clientWidth) / 2,
        y: ((1 - p.y) * canvas.clientHeight) / 2,
        visible: p.z < 1 && Math.abs(p.x) < 0.94 && Math.abs(p.y) < 0.94
      });
    }
    bubbleCallback(bubbles);

    labelCallback(
      STUDIOS.map(st => {
        const p = new THREE.Vector3(...st.labelAnchor).project(camera);
        return {
          x: ((p.x + 1) * canvas.clientWidth) / 2,
          y: ((1 - p.y) * canvas.clientHeight) / 2,
          visible: activeStudio === -1 && p.z < 1 && distance >= 12.5 && Math.abs(p.x) < 0.92 && Math.abs(p.y) < 0.92
        };
      })
    );
  }

  function renderNow() {
    updateCamera();
    if (!assetsReady) return;
    draw();
  }

  let birdTime=0;
  function hasBirdAction(){return !!(birdFlight||birdSpin||birdChirp)||workPresentation.hasAction();}
  function updateBirdPresentation(dt){
    birdTime+=dt;
    workPresentation.update(dt);
    if(carFollow){
      const s=workPresentation.stats();
      if(s.carStage==='desk-test'){
        fly=null;const p=new THREE.Vector3(...s.position);p.y+=.45;
        target.lerp(p,Math.min(1,dt*6));distance+=(8.5-distance)*Math.min(1,dt*4);polar+=(.45-polar)*Math.min(1,dt*4);
      }else if(s.carStage==='parked'){
        const saved=carFollow;carFollow=null;move(saved.target,saved.distance,saved.angle,saved.polar);
      }
    }

    if(currentBlueprint.id!=='mechanical-bird')return;
      centralBird.gears.forEach((bg, i) => {
        bg.rotation.x = birdTime * (i % 2 === 0 ? 1.85 : -2.45);
      });

      // Smoothly interpolate exploded blueprint inspection view
      const targetExplode = birdExploded && !birdFlight ? 1 : 0;
      explodeProgress += (targetExplode - explodeProgress) * Math.min(1, dt * 8);
      applyBirdExplode(centralBird,explodeProgress);

      for (const trayG of Object.values(tabletopTrays)) {
        if (trayG.visible) trayG.rotation.y = birdTime * 0.6;
      }

      if (birdFlight) {
        const u = Math.min(1, (birdTime - birdFlight.start) / birdFlight.duration);
        const flap = Math.sin(birdTime * 22) * 0.58;
        if (centralBird.leftWingPivot) centralBird.leftWingPivot.rotation.z = -flap;
        if (centralBird.rightWingPivot) centralBird.rightWingPivot.rotation.z = flap;
        const arcY = 0.59 + Math.sin(u * Math.PI) * 2.35;
        const circleR = Math.sin(u * Math.PI) * 0.85;
        centralBird.root.position.set(
          Math.sin(u * Math.PI * 2) * circleR,
          arcY,
          Math.cos(u * Math.PI * 2) * circleR * 0.5
        );
        centralBird.root.rotation.y = u * Math.PI * 2;
        if (u >= 1) {
          birdFlight = null;
          centralBird.root.position.set(0, 0.59, 0);
          centralBird.root.rotation.y = 0;
          if (centralBird.leftWingPivot) centralBird.leftWingPivot.rotation.z = 0;
          if (centralBird.rightWingPivot) centralBird.rightWingPivot.rotation.z = 0;
          syncBirdParts();
          craftAnimCallback({active: false, finished: true});
          eventCallback('機械小鳥完成展翅試飛，已回到中央圓桌！');
        }
      } else if (birdSpin) {
        const u = Math.min(1, (birdTime - birdSpin.start) / birdSpin.duration);
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        centralBird.root.position.set(0, 0.59 + Math.sin(u * Math.PI) * 0.12, 0);
        centralBird.root.rotation.y = ease * Math.PI * 4;
        const flap = Math.sin(birdTime * 12) * 0.24;
        if (centralBird.leftWingPivot) centralBird.leftWingPivot.rotation.z = -flap;
        if (centralBird.rightWingPivot) centralBird.rightWingPivot.rotation.z = flap;
        if (u >= 1) {
          birdSpin = null;
          centralBird.root.position.set(0, 0.59, 0);
          centralBird.root.rotation.y = 0;
        }
      } else if (birdChirp) {
        const u = Math.min(1, (birdTime - birdChirp.start) / birdChirp.duration);
        const hop = Math.abs(Math.sin(u * Math.PI * 6)) * 0.15;
        const flutter = Math.sin(birdTime * 28) * 0.44;
        centralBird.root.position.set(0, 0.59 + hop, 0);
        centralBird.root.rotation.y = Math.sin(u * Math.PI * 4) * 0.35;
        if (centralBird.parts.melody) centralBird.parts.melody.rotation.x = Math.sin(birdTime * 18) * 0.16;
        if (centralBird.lowerBeak) centralBird.lowerBeak.rotation.x = Math.abs(Math.sin(birdTime * 24)) * 0.32;
        if (centralBird.leftWingPivot) centralBird.leftWingPivot.rotation.z = -flutter;
        if (centralBird.rightWingPivot) centralBird.rightWingPivot.rotation.z = flutter;
        if (u >= 1) {
          birdChirp = null;
          centralBird.root.position.set(0, 0.59, 0);
          if (centralBird.parts.melody) centralBird.parts.melody.rotation.x = 0;
          if (centralBird.lowerBeak) centralBird.lowerBeak.rotation.x = 0;
        }
      } else {
        const showBird = installedParts.size >= 4;
        const idleFlap = showBird ? Math.sin(birdTime * 3.2) * 0.08 : 0;
        if (centralBird.leftWingPivot) centralBird.leftWingPivot.rotation.z = -idleFlap;
        if (centralBird.rightWingPivot) centralBird.rightWingPivot.rotation.z = idleFlap;
        centralBird.root.rotation.y = Math.sin(birdTime * 0.5) * 0.14;
      }

  }

  function updateResidents(dt){
      town.actors.forEach((a, i) => {
        const m = residentModels[i];
        const {p, r, cargo} = m;
        const moving = a.moving;
        const onStair = a.stage === 'stair-down' || a.stage === 'stair-up';
        let actorY = a.y;
        if (onStair) {
          const stepIdx = Math.min(10, Math.max(1, Math.ceil(a.stairT * 10)));
          const stepMidY = WORKSHOP.floor1Y + ((stepIdx - 0.5) / 10) * (WORKSHOP.floor2Y - WORKSHOP.floor1Y);
          actorY = Math.max(a.y, stepMidY) + 0.025;
        }
        p.position.set(a.p[0], actorY, a.p[1]);
        p.rotation.y =
          r.greeting > 0 && !a.life && !a.doorSession && !a.usingElevator
            ? Math.atan2(camera.position.x - p.position.x, camera.position.z - p.position.z)
            : a.yaw;

        const isCarrying = a.index<4&&['carried','returning','placing','return-pick','stowing'].includes(a.parcel.state);
        if (cargo) cargo.visible = false;

        if(a.life&&!moving){
          switchResidentClip(m,a.life.seated>.5?(a.index===6?'Listen':'Sit'):'Idle',.18);
        } else if (r.greeting > 0 && !a.doorSession) {
          switchResidentClip(m, 'Wave', 0.14);
        } else if (onStair) {
          switchResidentClip(m, isCarrying ? 'CarryWalk' : 'StairUp', 0.15);
        } else if (moving) {
          switchResidentClip(m, isCarrying ? 'CarryWalk' : 'Walk', 0.16);
        } else if (r.state === 'delivering' || r.state === 'loading' || r.state === 'inspecting') {
          switchResidentClip(m, 'Work', 0.20);
        } else {
          switchResidentClip(m, 'Idle', 0.22);
        }

        if (m.mixer) {
          const speedScale = a.priorityDelivery && moving ? 1.35 : 1.0;
          m.mixer.update(dt * speedScale);
        }
      });

    lifePresentation?.update();
  }

  function processTownEvents(events){
      for (const [idx, type, extra] of events) {
        const r = residentModels[idx].r;
        if (type === 'priority-handoff') {
          const done = pendingDelivery;
          if(!done||done.studioIndex!==idx)continue;
          pendingDelivery = null;
          syncBirdParts();
          if (done?.birdCompleted) {
            if(currentBlueprint.id==='mechanical-bird')birdFlight = {start: birdTime, duration: 5.0};
            else if(currentBlueprint.id==='clockwork-car')workPresentation.action('spin',{automatic:true});
            craftingShowcase = {
              studioIndex: done.studioIndex,
              partName: done.partName,
              start: simTime,
              until: simTime + 5.2
            };
            craftAnimCallback({
              active: true,
              inTransit: false,
              delivered: true,
              birdCompleted: true,
              partName: done.partName,
              edition: done.edition,
              studioName: STUDIOS[done.studioIndex]?.title || '工作室'
            });
            eventCallback(`🎉 ${r.name}將「${extra || r.cargo}」送達圓桌，${currentBlueprint.name}四個組件已合體，開始展示！`);
          } else {
            craftingShowcase = null;
            craftAnimCallback({
              active: false,
              inTransit: false,
              delivered: true,
              birdCompleted: false,
              partName: done?.partName || extra || r.cargo
            });
            eventCallback(`✓ ${r.name}已將「${extra || r.cargo}」送達中央製作臺托盤！`);
          }
        } else if (type === 'handoff') {
          eventCallback(`${r.name}把${r.cargo}送到中央製作臺（累計 ${r.completed} 趟）`);
        } else if (type === 'meet') {
          const other = residentModels[extra]?.r;
          if (other) {
            greetResident(r);
            greetResident(other);
          }
        } else if (type === 'dynamic-log') {
          if (extra) eventCallback(extra);
        } else if (type === 'dynamic-speech') {
          const now = performance.now();
          const blocked = !ambientGate() || [...speeches.values()].some(b => b.interactive && b.until > now);
          if (!blocked && extra?.text) {
            say('resident', idx, extra, false);
            chatter.defer(now, 4500);
          }
          if (extra?.logText) eventCallback(extra.logText);
        } else if (type === 'dynamic-animal-speech') {
          const now = performance.now();
          const blocked = !ambientGate() || [...speeches.values()].some(b => b.interactive && b.until > now);
          if (!blocked && extra?.text && animalModels[idx]) {
            say('animal', idx, extra, false);
            chatter.defer(now, 4200);
          }
        }
      }

  }

  function loop(now,renderFrame=true) {
    raf = 0;
    if (!visible) return;
    const dt = Math.max(0, Math.min((now - lastTime) / 1000, isSwiftShader ? 0.22 : 0.08));
    lastTime = now;

    if(assetsReady&&(!paused||hasBirdAction()))updateBirdPresentation(dt);
    if (!paused && assetsReady) {
      simTime += dt;
      if (autoDay) setHour(hour + dt * 0.14);
      else outdoorSky.update(hour,simTime);

      spatialPolys.forEach((m, i) => {
        m.rotation.y = simTime * (0.35 + i * 0.12);
      });
      clockGears.forEach((cg, i) => {
        cg.rotation.z = simTime * (i % 2 === 0 ? 0.55 : -0.82);
      });
      if (attentionMagnifier) {
        attentionMagnifier.rotation.y = -0.32 + Math.sin(simTime * 0.9) * 0.20;
      }
      shaftGears.forEach((sg, i) => {
        sg.rotation.z = simTime * (i % 2 === 0 ? 0.85 : -1.25);
      });

      if (craftingShowcase && simTime >= craftingShowcase.until) {
        craftingShowcase = null;
        if (!birdFlight) craftAnimCallback({active: false});
      }

      const events = town.update(dt);
      if (elevatorCabin) elevatorCabin.position.y = town.elevator.y;

      const actorNearLift = fl =>
        town.actors.some(
          a =>
            a.floor === fl &&
            (a.usingElevator ||
              a.stage === 'to-lift' ||
              a.stage === 'from-lift' ||
              Math.hypot(a.p[0] - ELEVATOR.x, a.p[1] - (ELEVATOR.z + 0.56)) < 0.88)
        );
      const targetOpen1F =
        town.elevator.floor === 1 &&
        !['moving','turning','moving-to-pickup'].includes(town.elevator.state) &&
        (town.elevator.state === 'boarding' || town.elevator.state === 'exiting' || actorNearLift(1))
          ? 1.25
          : 0;
      const targetOpen2F =
        town.elevator.floor === 2 &&
        !['moving','turning','moving-to-pickup'].includes(town.elevator.state) &&
        (town.elevator.state === 'boarding' || town.elevator.state === 'exiting' || actorNearLift(2))
          ? 1.25
          : 0;
      const targetCabinOpen = Math.max(targetOpen1F, targetOpen2F);

      liftDoorAngle1F += (targetOpen1F - liftDoorAngle1F) * Math.min(1, dt * 10);
      liftDoorAngle2F += (targetOpen2F - liftDoorAngle2F) * Math.min(1, dt * 10);
      cabinDoorAngle += (targetCabinOpen - cabinDoorAngle) * Math.min(1, dt * 10);

      if (liftGates.f1L) liftGates.f1L.rotation.y = -liftDoorAngle1F;
      if (liftGates.f1R) liftGates.f1R.rotation.y = liftDoorAngle1F;
      if (liftGates.f2L) liftGates.f2L.rotation.y = -liftDoorAngle2F;
      if (liftGates.f2R) liftGates.f2R.rotation.y = liftDoorAngle2F;
      if (cabinDoors.L) cabinDoors.L.rotation.y = -cabinDoorAngle;
      if (cabinDoors.R) cabinDoors.R.rotation.y = cabinDoorAngle;

      // 2F stair-side railings remain fixed in place as stationary safety guardrails
      if (stairGates.left) stairGates.left.rotation.y = 0;
      if (stairGates.right) stairGates.right.rotation.y = 0;

      updateResidents(dt);

      town.doors.forEach((d, id) => {
        const pivot = doorPivots.get(id);
        if (pivot) {
          const dir = id === 'door-switch' ? -1 : 1;
          pivot.rotation.y = dir * d.angle * 0.82;
        }
      });

      processTownEvents(events);

      updateAnimals(simTime, dt);

      const candidates = town.actors.map((a, i) => {
        const p = residentModels[i].p.position.clone();
        p.y += 0.9;
        p.project(camera);
        return {
          ...a.r,
          indoors: false,
          session: !!a.doorSession || a.usingElevator,
          manual: false,
          visible: p.z > -1 && p.z < 1 && Math.abs(p.x) < 0.85 && Math.abs(p.y) < 0.85
        };
      });
      const ambientBlocked = !ambientGate() || [...speeches.values()].some(b => b.interactive && b.until > now);
      const ambient = chatter.update(now, candidates, {
        blocked: ambientBlocked,
        hour,
        craftingProgress: installedParts.size,
        workName:currentBlueprint.name
      });
      if (ambient) say('resident', ambient.index, ambient, false);
    }

    if (fly) {
      const u = Math.min(1, (now - fly.start) / 750);
      const t = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      target.lerpVectors(fly.fromTarget, fly.toTarget, t);
      angle = THREE.MathUtils.lerp(fly.fromAngle, fly.toAngle, t);
      polar = THREE.MathUtils.lerp(fly.fromPolar, fly.toPolar, t);
      distance = THREE.MathUtils.lerp(fly.fromDistance, fly.toDistance, t);
      if (u === 1) fly = null;
    }

    updateCamera();
    if(renderFrame)draw();
    if (renderFrame && (!paused || fly || hasBirdAction())) {
      if (isSwiftShader) {
        setTimeout(() => {
          if (!paused || fly || hasBirdAction()) raf = requestAnimationFrame(loop);
        }, 140);
      } else {
        raf = requestAnimationFrame(loop);
      }
    }
  }

  function resume() {
    lastTime = performance.now();
    if (!raf && visible && assetsReady && (!paused || fly || hasBirdAction())) raf = requestAnimationFrame(loop);
  }

  function move(toTarget, toDistance, toAngle = angle, toPolar = polar) {
    if(viewingMode)return;
    atHome = Math.abs(toDistance - homeDistance()) < 0.5 && Math.abs(toTarget.x) < 0.2;
    fly = {
      start: performance.now(),
      fromTarget: target.clone(),
      toTarget: toTarget.clone(),
      fromDistance: distance,
      toDistance: clampCameraDistance(toDistance),
      fromAngle: angle,
      toAngle: clampCameraAngle(toAngle),
      fromPolar: polar,
      toPolar: clampCameraPolar(toPolar)
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || paused) {
      target.copy(fly.toTarget);
      distance = fly.toDistance;
      angle = fly.toAngle;
      polar = fly.toPolar;
      fly = null;
      renderNow();
    } else {
      resume();
    }
  }

  function overview() {
    dismissSpeech();
    activeStudio = -1;
    move(new THREE.Vector3(0, 2.42, 0.25), homeDistance(), 0.0, 0.27);
  }

  function focusStudio(idx) {
    const st = STUDIOS[idx];
    if (!st) return;
    activeStudio = idx;
    move(new THREE.Vector3(...st.focusTarget), st.focusDistance, st.focusAngle, st.focusPolar);
    eventCallback(`聚焦「${st.title}」：${residentModels[idx].r.name}正在準備${residentModels[idx].r.cargo}`);
  }

  function focusWorkbench() {
    activeStudio = -1;
    move(
      new THREE.Vector3(...CENTRAL_WORKBENCH.focusTarget),
      CENTRAL_WORKBENCH.focusDistance,
      CENTRAL_WORKBENCH.focusAngle,
      CENTRAL_WORKBENCH.focusPolar
    );
    eventCallback(`聚焦中央圓形製作臺：檢視${currentBlueprint.name}的組裝進度與零件細節`);
  }

  function playCraftingFeedback(event) {
    if (!event) return;
    const {
      studioIndex = 0,
      partId = null,
      partName = '工坊零件',
      birdCompleted = false,
      collectionEntry = null
    } = event;
    pendingDelivery = {
      studioIndex,
      partId,
      partName,
      birdCompleted: !!birdCompleted,
      edition: collectionEntry?.edition || 1
    };
    syncBirdParts();

    const actor = town.triggerStudioDelivery(studioIndex, partName);
    if (actor) {
      say(
        'resident',
        actor.index,
        {
          text: `太棒了！「${partName}」準備完成，我現在送去中央製作臺！`,
          mood: '興奮配送',
          emote: '⚙'
        },
        true
      );
    }
    focusWorkbench();
    craftingShowcase = {
      studioIndex,
      partName,
      start: simTime,
      until: simTime + 12.0
    };
    eventCallback(`收到挑戰成果！${residentModels[studioIndex]?.r.name || '居民'}正捧著「${partName}」前往中央製作臺…`);
    craftAnimCallback({
      active: true,
      inTransit: true,
      birdCompleted,
      partName,
      studioName: STUDIOS[studioIndex]?.title || '工作室'
    });
    renderNow();
  }

  function skipCraftingAnimation() {
    const done = pendingDelivery;
    pendingDelivery = null;
    for (const a of town.actors) {
      if (a.priorityDelivery) {
        a.priorityDelivery = false;
        a.priorityPartName = null;
        // Skipping presentation reveals the part immediately but leaves residents on their physical routes.
      }
    }
    if (birdFlight) {
      birdFlight = null;
      centralBird.root.position.set(0, 0.59, 0);
      centralBird.root.rotation.y = 0;
      if (centralBird.leftWingPivot) centralBird.leftWingPivot.rotation.z = 0;
      if (centralBird.rightWingPivot) centralBird.rightWingPivot.rotation.z = 0;
    }
    craftingShowcase = null;
    syncBirdParts();
    craftAnimCallback({
      active: false,
      skipped: true,
      delivered: !!done,
      birdCompleted: !!done?.birdCompleted,
      partName: done?.partName,
      edition: done?.edition || 1
    });
    renderNow();
    if(workPresentation.hasAction())resume();
  }

  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pure viewing uses the entire canvas; hidden dock bounds must not offset it.
    if(viewingMode)camera.clearViewOffset();
    else{
      const dock=document.querySelector('.dock')?.getBoundingClientRect();
      const bottom=dock&&dock.height>0?Math.max(0,h-dock.top):0;
      const top=w<900?155:95;
      camera.setViewOffset(w,h,0,Math.max(0,(bottom-top)/2),w,h);
    }
    camera.updateProjectionMatrix();
    if (atHome) distance = homeDistance();
    renderNow();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (!visible) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      resume();
    }
  });

  // Release GPU resources when a document leaves. BFCache restores keep their scene intact.
  window.addEventListener('pagehide',event=>{
    visible=false;cancelAnimationFrame(raf);raf=0;
    if(event.persisted)return;
    clearTimeout(speechTimer);ro.disconnect();
    const geometry=new Set(),materials=new Set(),textures=new Set();
    scene.traverse(n=>{if(n.geometry)geometry.add(n.geometry);if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);});
    for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}
    for(const sets of sharedTexSets.values())for(const tex of Object.values(sets))if(tex)textures.add(tex);
    for(const geo of geometry)geo.dispose();for(const tex of textures)tex.dispose();
    gramophoneAudio.dispose();
    scene.environment?.dispose();renderer.dispose?.();renderer.forceContextLoss?.();
  });
  window.addEventListener('pageshow',event=>{if(event.persisted){visible=true;if(paused)renderNow();else resume();}});

  syncBirdParts();
  setHour(11.0);
  resize();
  resume();

  const api = {
    isSoftware: !!renderer.isSoftware,
    step(dt = 0.08, renderFrame = true) {
      const wasPaused = paused;
      paused = false;
      const now = performance.now();
      lastTime = now - dt * 1000;
      loop(now,renderFrame);
      paused = wasPaused;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    overview,
    focus: focusStudio,
    focusWorkbench,
    setView(toTarget, toDistance, toAngle, toPolar) {
      fly = null;
      atHome = false;
      if (Array.isArray(toTarget)) target.set(...toTarget);
      if (typeof toDistance === 'number') distance = clampCameraDistance(toDistance);
      if (typeof toAngle === 'number') angle = clampCameraAngle(toAngle);
      if (typeof toPolar === 'number') polar = clampCameraPolar(toPolar);
      renderNow();
    },
    getStats() {
      return {
        ...loadedStats,
        assetsReady,
        viewingMode,paused,navigationMode:panMode?'pan':'rotate',cameraOffsetY:camera.view?.enabled?camera.view.offsetY:0,
        simulationSeconds: +simTime.toFixed(3),
        residentMode: town.residentMode,
        dynamicEvents: town.dynamicEvents?.getStats() || null,
        work:workPresentation.stats(),
        life:lifePresentation?.stats(),
        gramophoneAudio:gramophoneAudio.stats(),
        carCameraFollowing:!!carFollow,
        componentTraysVisible:componentTrayPads?.visible??true,
        activeBlueprintId:currentBlueprint.id,
        deliveredParts:[...installedParts].filter(id=>id!==pendingDelivery?.partId),
        lamp:{...lampOptions,preview:lampPreview,moving:lampMoveMode,lightIntensity:deskLight.intensity,source:deskLight.position.toArray(),target:deskLight.target.position.toArray(),direction:new THREE.Vector3().subVectors(deskLight.target.position,deskLight.position).normalize().toArray()},
        birdAction:{active:currentBlueprint.id==='mechanical-bird'&&hasBirdAction(),position:centralBird.root.position.toArray(),time:+birdTime.toFixed(3)},
        renderProfile: RENDER_PROFILE.id,
        environment: !!scene.environment,
        outdoorPhase: outdoorPhase(hour),
        sky: skyState(hour,simTime),
        deskLampLevel: +deskLampLevel(hour).toFixed(3),
        skylightMaterials: [...cutawayMaterials].filter(m=>m.name==='Skylight_Clear_Glass').map(m=>({opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite})),
        camera: JSON.parse(canvas.dataset.view || '{}'),
        rendererName: rendererUnmaskedName,
        isSwiftShader,
        renderInfo: renderer.info
          ? {
              calls: renderer.info.render?.calls || 0,
              triangles: renderer.info.render?.triangles || 0,
              geometries: renderer.info.memory?.geometries || 0,
              textures: renderer.info.memory?.textures || 0
            }
          : null
      };
    },
    setViewingMode(active){
      viewingMode=!!active;fly=null;
      if(viewingMode){carFollow=null;lampMoveMode=false;finishLampDrag();}
      for(const id of touches.keys()){try{canvas.releasePointerCapture(id);}catch{}}
      touches.clear();pointerDown=lastPointer=null;dragging=gesture=false;pinchDistance=0;pinchCenter=null;
      canvas.style.cursor=panMode?'move':'grab';
      resize();
    },
    setNavigationMode(mode) {
      panMode = mode === 'pan';
      canvas.style.cursor = panMode ? 'move' : 'grab';
    },
    setCutaway(enabled) {
      cutawayEnabled = !!enabled;
      renderNow();
    },
    setPaused(v) {
      if (paused && !v) chatter.defer(performance.now(), 1800);
      paused = !!v;
      cancelAnimationFrame(raf);
      raf = 0;
      if (!paused || fly || hasBirdAction()) resume();
      else draw();
    },
    setQuality(v) {
      renderer.setPixelRatio(renderer.isSoftware ? Math.min(v, 0.85) : isSwiftShader ? 1.0 : v);
      resize();
    },
    setTime(h, keepFlowing = true) {
      autoDay = !!keepFlowing;
      setHour(h);
      renderNow();
    },
    setAutoDay(v) {
      autoDay = !!v;
    },
    syncCrafting(state) {
      installedParts = new Set(state?.installedParts || []);
      const next=BLUEPRINTS.find(b=>b.id===state?.activeBlueprintId)||BLUEPRINTS[0];
      if(next.id!==currentBlueprint.id){pendingDelivery=null;craftingShowcase=null;workPresentation.reset();for(const a of town.actors){a.priorityDelivery=false;a.priorityPartName=null;}}
      currentBlueprint=next;
      residentModels.forEach((m,i)=>{m.r.workName=next.name;if(i<4)m.r.cargo=next.parts[i].name;});
      collectedCount = state?.collections?.length || 0;
      syncBirdParts();
      renderNow();
      if(workPresentation.hasAction())resume();
    },
    playCraftingFeedback,
    skipCraftingAnimation,
    triggerWorkAction(action) {
      if(installedParts.size<4||pendingDelivery)return false;
      fly=null;
      if(currentBlueprint.id==='mechanical-bird')return api.triggerBirdAction(({primary:'fly',secondary:'chirp'})[action]||action);
      if(currentBlueprint.id==='clockwork-car'&&action==='primary'&&workPresentation.stats().carStage==='parked')carFollow={target:target.clone(),distance,angle,polar};
      const result=workPresentation.action(action);if(workPresentation.hasAction())resume();renderNow();return result;
    },
    setLamp(pitch=58,yaw=-12,preview=lampPreview){
      return api.setLampOptions({...lampOptions,pitch,yaw},preview);
    },
    setLampOptions(options={},preview=lampPreview){
      lampOptions=normalizeLamp({...lampOptions,...options});
      lampPitch=lampOptions.pitch;lampYaw=lampOptions.yaw;lampPreview=!!preview;
      updateLamp();renderNow();return {...lampOptions,preview:lampPreview};
    },
    setLampMoveMode(on){
      lampMoveMode=!!on;finishLampDrag();
      if(lampMoveMode)move(new THREE.Vector3(-5.6,1.7,.2),21,-.06,.40);
      canvas.style.cursor=lampMoveMode?'move':'grab';
    },
    onLampChange(fn){lampChangeCallback=fn;},
    setSound(on,volume){gramophoneAudio.setOptions(on,volume);},
    onLamp(fn){lampCallback=fn;},
    triggerBirdAction(action) {
      if (installedParts.size < 4 || pendingDelivery || currentBlueprint.id!=='mechanical-bird') return false;
      for (const group of Object.values(centralBird.parts)) {
        if (group) group.visible = true;
      }
      fly=null;
      if (action === 'spin') {
        birdFlight = null;
        birdChirp = null;
        birdSpin = {start: birdTime, duration: 3.2};
        eventCallback('🔄 機械小鳥正在中央圓桌進行 360° 發條旋轉展示！');
      } else if (action === 'fly') {
        fly=null;
        birdSpin = null;
        birdChirp = null;
        birdExploded = false;
        birdFlight = {start: birdTime, duration: 5.0};
        eventCallback('🦅 機械小鳥展開黃銅羽翼，環繞中央挑高大廳展翅飛翔！');
      } else if (action === 'chirp') {
        birdFlight = null;
        birdSpin = null;
        birdChirp = {start: birdTime, duration: 3.0};
        eventCallback('🎵 機械小鳥轉動記憶音筒，在圓桌上輕快跳躍鳴唱！');
      } else if (action === 'explode') {
        birdFlight = null;
        birdExploded = !birdExploded;
        if (paused) {
          explodeProgress = birdExploded ? 1 : 0;
          applyBirdExplode(centralBird,explodeProgress);
        }
        eventCallback(birdExploded ? '🔍 已展開機械小鳥「四部位爆炸圖拆解檢視」模式！' : '⚙ 已將四部位零件重新合體復原！');
      }
      if (paused) resume();
      renderNow();
      return birdExploded;
    },
    residents() {
      return town.actors.map(a => ({
        ...a.r,
        floor: a.floor,
        status: residentStatus(a.r)
      }));
    },
    visitResident(i) {
      const m = residentModels[i];
      if (!m) return;
      move(m.p.position.clone().add(new THREE.Vector3(0, 0.45, 0)), 9.5, clampCameraAngle(angle * 0.5), 0.36);
      talk(i);
    },
    talkResident: talk,
    requestResidentAction(i) {
      const res = town.requestAction(i);
      if (!res) return;
      say(
        'resident',
        i,
        {
          text: res.type==='life'?'一起享受工坊的咖啡與音樂吧！':res.type === 'elevator' ? '收到！我現在去搭乘中央齒輪升降臺！' : '好呀！我把準備好的材料送去中央製作臺！',
          mood: '立即出發',
          emote: '⚙'
        },
        true
      );
      renderNow();
    },
    animals() {
      return animalModels.map(({g, mixer, wings, treat, actions, ...a}) => a);
    },
    visitAnimal,
    interactAnimal(i, action) {
      const response = interactAnimal(i, action);
      if (!response) return;
      say('animal', i, response, true);
      renderNow();
    },
    dismissSpeech,
    setAmbientGate(fn) {
      ambientGate = fn;
    },
    onLabels(fn) {
      labelCallback = fn;
      draw();
    },
    onClock(fn) {
      clockCallback = fn;
      setHour(hour);
    },
    onEvent(fn) {
      eventCallback = fn;
    },
    onResident(fn) {
      residentCallback = fn;
      },
    onAnimal(fn) {
      animalCallback = fn;
    },
    onSpeech(fn) {
      speechCallback = fn;
    },
    onBubbles(fn) {
      bubbleCallback = fn;
    },
    onGesture(fn) {
      gestureCallback = fn;
    },
    onCraftAnim(fn) {
      craftAnimCallback = fn;
    }
  };

  globalThis.__workshopWorld = api;
  return api;
}
