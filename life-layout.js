// Authored furniture, interaction anchors and routes; also read by the GLB builder.
export const LIFE_LAYOUT = {
  "coffee": {"table": [-4.40,0.44,0.54], "radius": 0.49, "top": 0.78,
    "seats": [[-5.06,0.44,0.54],[-3.74,0.44,0.54]],
    "cups": [[-4.72,0.795,0.54],[-4.08,0.795,0.54]], "saucerY": 0.781},
  "seating": {"top":0.145,"hipY":0.272,"depthScale":0.55,"centerZ":-0.075,"exitDistance":0.34,"transitionSeconds":1.1},
  "music": {"cabinet": [4.65,0.44,-0.06], "operator": [3.96,0.44,-0.12],
    "seat": [5.72,0.44,0.32], "rest": [5.62,0.44,-0.48]},
  "couriers": [
    {"pickup": [-3.52,-1.00], "source": [-3.52,3.445,-0.72]},
    {"pickup": [2.64,-0.56], "source": [2.64,3.445,-0.84]},
    {"pickup": [-3.08,0.10], "source": [-3.08,0.705,-0.18]},
    {"pickup": [3.08,0.10], "source": [3.08,0.705,-0.18]}
  ],
  "receivers": [[-1.36,0.705,1.68],[1.36,0.705,1.68],[-1.36,0.705,2.02],[1.36,0.705,2.02]],
  "rearPassageZ": -0.60,
  "obstacles": [
    {"id":"coffee-table","shape":"circle","x":-4.40,"z":0.54,"radius":0.49,"hx":0.49,"hz":0.49,"top":0.80},
    {"id":"gramophone-cabinet","x":4.65,"z":-0.06,"hx":0.34,"hz":0.27,"top":1.55}
  ]
};
