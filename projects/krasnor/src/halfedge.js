import Vector from './vec'
import Matrix from './mat'
import PriorityQueue from './pq'
import {BufferGeometry} from "three";

class Halfedge {
  constructor() {
    this.vertex = null // Vertex
    this.edge   = null // Edge
    this.face   = null // Face

    this.prev = null   // Halfedge
    this.next = null   // Halfedge
    this.twin = null   // Halfedge
    this.idx  = -1     // Number

    // Hint: try use this variable to record if a halfedge is on the boundary
    this.onBoundary = false // Boolean
  }
  // TODO: you can add more methods if you need here
  vector() {
    return this.next.vertex.position.sub(this.vertex.position)
  }
  angle() {
    const u = this.prev.vector().unit()
    const v = this.next.vector().scale(-1).unit()
    return Math.acos(Math.max(-1, Math.min(1, u.dot(v))))
  }
  cotan() {
    if (this.onBoundary) {
      return 0
    }
    const u = this.prev.vector()
    const v = this.next.vector().scale(-1)
    return u.dot(v) / u.cross(v).norm()
  }
  getVector() {
    const vector = this.twin.vertex.position.sub(this.vertex.position)
    return vector
  }
}

class Edge {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  // TODO: you can add more methods if you need here
  getVertices(){
    return [this.halfedge.vertex, this.halfedge.twin.vertex]
  }
  getP1(){
    return this.halfedge.vertex;
  }
  getP2(){
    return this.halfedge.twin.vertex;
  }


  faces(fn) {
    // no radial cycle so there can only be between zero two faces at this edge
    let f1 = this.halfedge.face;
    let f2 = this.halfedge.twin.face;
    let i = 0;

    if(!this.halfedge.onBoundary && f1 != null){ // onBoundary => no face
      fn(f1, i++)
    }
    if(!this.halfedge.twin.onBoundary && f2 != null){
      fn(f2, i++)
    }
  }
  /**
   * Calculates Midpoint of Edge
   * @returns {Vector} Coordinates of Midpoint
   */
  calculateMidpoint(){
    let midpoint = this.halfedge.vertex.position.add(this.halfedge.twin.vertex.position).scale(0.5);
    return midpoint;
  }
}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
    this.isQuad = false
  }
  // vertices visit all vertices of the given face, and
  // fn is a callback that receives the visited vertices
  // and order index. For example, the usage could be:
  //
  //    f.vertices((vertex, orderIdx) => {
  //      ... // do something for the vertex
  //    })
  //
  // if one does not need to access the order index,
  // one can simply call the function as follows:
  //
  //    f.vertices(v => { ... })
  vertices(fn) {
    // TODO: iterate all vertices.
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.next) {
      fn(h.vertex, i)
      start = false
      i++
    }
  }
  // TODO: you can add more methods if you need here
  halfedges(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.next) {
      fn(h, i)
      start = false
      i++
    }
  }
  // normal() {
  //   if (this.halfedge.onBoundary) {
  //     return new Vector(0, 0, 0)
  //   }
  //   const h = this.halfedge
  //   let a = h.vertex.position.sub(h.next.vertex.position)
  //   let b = h.prev.vertex.position.sub(h.vertex.position).scale(-1)
  //   return a.cross(b).unit()
  // }
  normal(){
    let x = this.halfedge.getVector();
    let y = this.halfedge.prev.twin.getVector();
    let triangleNormal = x.cross(y).unit();

    if(this.isQuad){
      let x2 = this.halfedge.prev.prev.getVector();
      let y2 = this.halfedge.next.twin.getVector();
      let secondTriangleNormal = (x2.cross(y2)).unit();
      return triangleNormal.add(secondTriangleNormal).scale(0.5).unit();
    }
    return triangleNormal;
  }

  area() {
    const h = this.halfedge
    if (h.onBoundary) {
      return 0
    }
    let a = h.vertex.position.sub(h.next.vertex.position)
    let b = h.prev.vertex.position.sub(h.vertex.position).scale(-1)
    return a.cross(b).norm() * 0.5
  }

  /**
   * Calculates midpoint of Face
   * @returns {Vector} position of midpoint
   */
  calculateMidpoint(){
    let cnt_face_verts = 0;
    let newPoint = new Vector();
    this.vertices(v => {
      cnt_face_verts++;
      newPoint = newPoint.add(v.position);
    })

    return newPoint.scale(1/cnt_face_verts)
  }
}

class Vertex {
  constructor() {
    this.position = null // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
    this.uv      = new Vector()   // Fix error in prepare buffer
    this.dbg_isEdgeMidpoint = false;
  }
  normal(method='equal-weighted') {
    let n = new Vector()
    switch (method) {
    case 'equal-weighted':
      // TODO: compute euqally weighted normal of this vertex
      // console.log("vertex: %s (old idx) %s (new idx) - hf: %s",this.oldIdx, this.idx, this.halfedge.oldIdx)
      this.faces(f => { n = n.add(f.normal())})
      return n.unit()
    case 'area-weighted':
      // TODO: compute area weighted normal of this vertex
      this.faces(f => { n = n.add(f.normal().scale(f.area())) })
      return n.unit()
    case 'angle-weighted':
      // TODO: compute angle weighted normal of this vertex
      this.halfedges(h => {
        n = n.add(h.face.normal().scale(h.next.angle()))
      })
      return n.unit()
    default: // undefined
      return new Vector()
    }
  }
  // TODO: you can add more methods if you need here
  faces(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.twin.next) {
      if(h.onBoundary) {
        continue
      }
      fn(h.face, i)
      start = false
      i++
    }
  }
  halfedges(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.twin.next) {
      fn(h, i)
      start = false
      i++
    }
  }
  vertices(fn) {
    this.halfedges((h, i) => {
      fn(h.next.vertex, i)
    })
  }

  /**
   *
   * @returns {Matrix}
   */
  computeQi(){
    let curr_vertex_pos = this.position;
    let sum_of_Ks = new Matrix();
    this.faces(
        (f, idx) => {
          let normal = f.normal(); //.unit();
          let a = normal.x; let b = normal.y; let c = normal.z;
          let d = -(normal.dot(curr_vertex_pos));

          // calc fundamental error quadric
          let k = new Matrix(
              a*a, a*b, a*c, a*d,
              a*b, b*b, b*c, b*d,
              a*c, b*c, c*c, c*d,
              a*d, b*d, c*d, d*d
          )
          sum_of_Ks = sum_of_Ks.add(k);
        }
    );
    return sum_of_Ks;
  }


}


export class HalfedgeMesh {
  /**
   * constructor constructs the halfedge-based mesh representation.
   *
   * @param {string} data is a text string from an .obj file
   */
  constructor(data) {
    // properties we plan to cache
    this.vertices  = [] // an array of Vertex object
    this.edges     = [] // an array of Edge object
    this.faces     = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object
    this.boundaries= [] // an array of boundary loops
    let n_bcycles = 0;
    this.isQuadMesh = false
    this.subdivisionCounter = 0;


    // TODO: read .obj format and construct its halfedge representation
    // load .obj file
    let indices   = []
    let positions = []
    let lines = data.split('\n')
    let containsQuad = false

    // search for the a quad in the object file
    for (let line of lines) {
      line = line.trim()
      const tokens = line.split(' ')
      switch(tokens[0].trim()) {
        case 'f':
          const isQuad = tokens.length == 5
          containsQuad = containsQuad || isQuad
          break;

      }

      if(containsQuad)
        break;
    }

    for (let line of lines) {
      line = line.trim()
      const tokens = line.split(' ')
      switch(tokens[0].trim()) {
        case 'v':
          positions.push(new Vector(
              parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]),
          ))
          continue
        case 'f':
          const isQuad = tokens.length == 5 // v 1 2 3 4

          // only load indices of vertices
          for (let i = 1; i < tokens.length; i++) {
            indices.push(parseInt((tokens[i].split('/')[0]).trim()) - 1)
            // indices.push(parseInt((tokens[i].split('\/\/|\/')[0]).trim()) - 1) // alternative, which would split the alternative format correctly, but we do only care about vertices (index 0) so its not needed
          }
          if(containsQuad && !isQuad)
            indices.push(-1)

          continue
      }
    }

    // build the halfedge connectivity
    const edges = new Map()
    let nOfEdges = 3
    if(containsQuad){
      this.isQuadMesh = true
      nOfEdges = 4
    }

    for (let i = 0; i < indices.length; i += nOfEdges) {
      let nFaceEdges = indices[i + (nOfEdges-1)] != -1 && containsQuad  ? 4 : 3
      for (let j = 0; j < nFaceEdges; j++) { // check a face
        let a = indices[i + j]
        let b = indices[i + (j+1)%nFaceEdges]

        if (a > b) {
          let tmp = b
          b = a
          a = tmp
        }

        // store the edge if not exists
        const e = `${a}-${b}`
        if (!edges.has(e)) {
          edges.set(e, [a, b])
        }
      }
    }

    this.vertices   = new Array(positions.length) // for update
    this.edges      = new Array(edges.size)
    this.faces      = new Array(indices.length / nOfEdges)
    this.halfedges  = new Array(edges.size*2)

    const idx2vert = new Map()
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex()
      v.uv = new Vector(0,0,0)
      v.position = positions[i]
      this.vertices[i] = v
      idx2vert.set(i, v)
    }

    let edgeIndex = 0
    let edgeCount = new Map()
    let existedHalfedges = new Map()
    let hasTwinHalfedge = new Map()
    let trueIndex = 0

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += nOfEdges) {
      // construct face
      const f = new Face()
      this.faces[i / nOfEdges] = f
      // if it contains quads set default value to true else false
      let isQuad = indices[i + (nOfEdges-1)] != -1 && containsQuad
      let nFaceEdges = isQuad ? 4 : 3

      // construct halfedges of the face
      for (let j = 0; j < nFaceEdges; j++) {
        const he = new Halfedge()
        this.halfedges[trueIndex+j] = he
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < nFaceEdges; j++) {
        // halfedge from vertex a to vertex b
        let a = indices[i + j]
        let b = indices[i + (j+1)%nFaceEdges]

        // halfedge properties
        const he = this.halfedges[trueIndex + j]
        he.next = this.halfedges[trueIndex + (j+1)%nFaceEdges]
        he.prev = this.halfedges[trueIndex + (j+(nFaceEdges-1))%nFaceEdges]
        he.onBoundary = false
        hasTwinHalfedge.set(he, false) // record if the twin of this half edge is constructed

        // point halfedge and vertex a to each other
        const v = idx2vert.get(a)
        he.vertex = v
        v.halfedge = he

        // point halfedge and face to each other
        he.face = f
        f.halfedge = he

        // swap if index a > b, for twin checking
        if (a > b) {
          let tmp = b
          b = a
          a = tmp
        }
        const edgeKey = `${a}-${b}`
        if (existedHalfedges.has(edgeKey)) {
          // if a halfedge between a and b has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHalfedges.get(edgeKey)
          he.twin = twin
          twin.twin = he
          he.edge = twin.edge

          hasTwinHalfedge.set(he, true)
          hasTwinHalfedge.set(twin, true)
          edgeCount.set(edgeKey, edgeCount.get(edgeKey)+1)
        } else {
          // this is a new halfedge, create the edge
          const e = new Edge()
          this.edges[edgeIndex] = e
          edgeIndex++
          he.edge = e
          e.halfedge = he

          // record newly created edge and halfedge from a to b
          existedHalfedges.set(edgeKey, he)
          edgeCount.set(edgeKey, 1)
        }

        // error checking
        if (edgeCount.get(edgeKey) > 2) {
          throw 'the mesh contains non-manifold edges'
        }
      }

      trueIndex += nFaceEdges
      f.isQuad = isQuad
    }

    // create boundary halfedges and "fake" faces for the boundary cycles
    let halfedgeIndex = trueIndex
    for (let i = 0; i < trueIndex; i++) {
      // if a halfedge has no twin, create a new face and link it
      // the corresponding boundary cycle

      const he = this.halfedges[i]
      if (!hasTwinHalfedge.get(he)) {
        n_bcycles++
        // create face
        const f = new Face()

        // walk along boundary cycle
        let boundaryCycle = []
        let current = he
        do {
          const boundaryHalfedge = new Halfedge()
          this.halfedges[halfedgeIndex] = boundaryHalfedge
          halfedgeIndex++
          boundaryCycle.push(boundaryHalfedge)

          // grab the next halfedge along the boundary that does not
          // have a twin halfedge
          let nextHe = current.next
          while (hasTwinHalfedge.get(nextHe)) {
            nextHe = nextHe.twin.next
          }

          // set the current halfedge's attributes
          boundaryHalfedge.vertex = nextHe.vertex
          boundaryHalfedge.edge = current.edge
          boundaryHalfedge.onBoundary = true

          // point the new halfedge and face to each other
          boundaryHalfedge.face = f
          f.halfedge = boundaryHalfedge

          // point the new halfedge and twin to each other
          boundaryHalfedge.twin = current
          current.twin = boundaryHalfedge

          current = nextHe
        } while (current != he)
        this.boundaries.push(boundaryCycle) // ## adding boundary cycle array

        // link the cycle of boundary halfedges together
        const n = boundaryCycle.length
        for (let j = 0; j < n; j++) {
          boundaryCycle[j].next = boundaryCycle[(j + n - 1) % n]
          boundaryCycle[j].prev = boundaryCycle[(j + 1) % n]
          hasTwinHalfedge.set(boundaryCycle[j], true)
          hasTwinHalfedge.set(boundaryCycle[j].twin, true)
        }
      }
    }
    // allocate indices for all elements
    let index = 0
    this.vertices.forEach(v => {
      v.idx = index++
    })
    index = 0
    this.edges.forEach(e => {
      e.idx = index++
    })
    index = 0
    this.faces.forEach(f => {
      f.idx = index++
    })
    index = 0
    this.halfedges.forEach(he => {
      he.idx = index++
    })

    console.log("finished mesh parsing")
    console.log("boundary cycles: " + this.boundaries.length)
    console.log("boundary[0] length: " + this.boundaries[0]?.length)
    console.log("")
  }

  subdivide_catmull_clark(iterations = 0){
    console.log("############ Subdivide - Catmull Clark ## iterations: %s ############", iterations);
    for(let iter = 0; iter < iterations; iter++){
      this.subdivisionCounter++;
      let new_FacePoints = new Map(); // [face.idx, Vertex] midpoint of face
      let new_movedEdgePoints = new Map(); // [edge.idx, Vertex] moved midpoints of new edges
      let edgeMidpoints = new Map(); // [edge.idx, Vector] midpoints of new edges

      let newVertexIndexStart = this.vertices.length;
      let nextVertexIndex = newVertexIndexStart;
      console.log("1. create new FacePoints");

      // 1. create new Face Vertices
      for(let i_f = 0; i_f < this.faces.length; i_f++){
        let curr_face = this.faces[i_f];

        let newVert = new Vertex();
        newVert.position = curr_face.calculateMidpoint();
        newVert.idx = nextVertexIndex++;
        this.vertices.push(newVert)
        console.log("created facePoint: v %s (%s,%s,%s) ", newVert.idx, newVert.position.x,newVert.position.y, newVert.position.z);

        new_FacePoints.set(curr_face.idx, newVert);
      }
      console.log("2. create newEdgePoints");
      // 2. create new Edge Points (not yet linked up)
      for(let i_e = 0; i_e < this.edges.length; i_e++){
        let curr_edge = this.edges[i_e];
        let edgeMidpoint = curr_edge.calculateMidpoint();

        let cnt_faces = 0;
        let _sumAdjacentPoints = new Vector();
        curr_edge.faces(
            f => {
              cnt_faces++;
              _sumAdjacentPoints = _sumAdjacentPoints.add(new_FacePoints.get(f.idx).position);
            }
        );
        let newEdgePos = edgeMidpoint;
        let avg_facePoint = new Vector();
        if(cnt_faces > 1){
          // not a boundary edge;
          avg_facePoint = _sumAdjacentPoints.scale(1/cnt_faces);
          newEdgePos = edgeMidpoint.add(avg_facePoint).scale(0.5)
        }

        let newVert = new Vertex();
        newVert.position = newEdgePos;
        newVert.idx = nextVertexIndex++;
        newVert.dbg_isEdgeMidpoint = true;
        this.vertices.push(newVert);

        new_movedEdgePoints.set(curr_edge.idx, newVert);
        edgeMidpoints.set(curr_edge.idx, edgeMidpoint);
      }
      console.log("3. calculate displacement for original points");

      // 3. calculate displacement for original points
      for(let i_v = 0; i_v < newVertexIndexStart; i_v++){
        // only iterate over original points
        let vertex = this.vertices[i_v];
        let isBoundaryVertex = false;
        if(vertex.idx >= 8 && vertex.idx <= 13){
          console.log("moving a previous facePoint: v%s (%s,%s,%s)", vertex.idx, vertex.position.x,vertex.position.y, vertex.position.z)
        }

        let _sum_faces = new Vector();
        let count_faces = 0;
        vertex.faces(
            f => {
              count_faces++;
              _sum_faces = _sum_faces.add(new_FacePoints.get(f.idx).position);
            }
        );
        let Q = _sum_faces.scale(1/count_faces);

        let count_edges = 0;
        let _sum_edges = new Vector();
        vertex.halfedges(
            hf => {
              count_edges++;
              _sum_edges = _sum_edges.add(edgeMidpoints.get(hf.edge.idx));
              if(hf.onBoundary || hf.twin.onBoundary){
                isBoundaryVertex = true;
              }
            }
        );

        let R = _sum_edges.scale(1/count_edges);
        let N = count_edges;
        let N_inv = 1/N;
        let S = vertex.position;

        // Q/n + 2R/n + S(n-3)/n
        let p1 = Q.scale(N_inv);
        let p2 = R.scale(2).scale(N_inv);
        let p3 = S.scale(N-3).scale(N_inv);
        let newOriginalPointLocation = p1.add(p2).add(p3);

        if(isBoundaryVertex){
          // boundary vertex. use different weighting
          // take average of the edges midpoints and the vertex point

          // let new_point = _sum_edges.add(S).scale(1/(count_edges+1));
          let weightedVPos = S.scale(2); // make it a bit rounder -> higher weight on original vertexPoint
          let new_point = _sum_edges.add(weightedVPos).scale(1/(count_edges+2));

          newOriginalPointLocation = new_point
          console.log("boundary vertex found");
        }
          vertex.position = newOriginalPointLocation;
      }

      // 4. link everything up
      console.log("4. link everything up - splitting edges");


      // split the edges
      let nextHfIndex = this.halfedges.length;
      let nextEdgeIndexStart = this.edges.length;
      let nextEdgeIndex = nextEdgeIndexStart;
      for(let i_e = 0; i_e < nextEdgeIndexStart; i_e++){
        let curr_edge = this.edges[i_e];
        let old_hf1 = curr_edge.halfedge;
        let old_hf2 = old_hf1.twin;
        let midpoint_vertex = new_movedEdgePoints.get(curr_edge.idx);


        // prepare needed objects
        let new_Edge = new Edge();
        new_Edge.idx = nextEdgeIndex++;

        let new_hf1 = new Halfedge();
        let new_hf2 = new Halfedge();
        new_hf1.idx = nextHfIndex++;
        new_hf2.idx = nextHfIndex++;
        new_hf1.twin = new_hf2;
        new_hf2.twin = new_hf1;
        new_hf1.edge = new_Edge;
        new_hf2.edge = new_Edge;

        new_Edge.halfedge = new_hf1;
        midpoint_vertex.halfedge = new_hf1;

        this.edges.push(new_Edge);
        this.halfedges.push(new_hf1);
        this.halfedges.push(new_hf2);

        // integrate everything
        //
        //  old_hf1.next xA <-----old_hf1--------- xB old_hf1.prev
        //  old_hf2.prev xA ------old_hf2--------> xB old_hf2.next
        //
        //  old_hf1.next xA <--new_hf1-- mid_point <--old_hf1----- xB old_hf1.prev
        //  old_hf2.prev xA ---new_hf2-> mid_point ---old_hf2----> xB old_hf2.next

        new_hf1.vertex = midpoint_vertex; // midpoint
        new_hf1.face = old_hf1.face;
        new_hf1.prev = old_hf1;
        new_hf1.onBoundary = old_hf1.onBoundary;
        new_hf1.next = old_hf1.next;
        old_hf1.next = new_hf1;
        new_hf1.next.prev = new_hf1;

        new_hf2.vertex = old_hf2.vertex; // xA
        old_hf2.vertex.halfedge = new_hf2;
        old_hf2.vertex = midpoint_vertex;
        new_hf2.face = old_hf2.face;
        new_hf2.next = old_hf2;
        new_hf2.onBoundary = old_hf2.onBoundary;
        new_hf2.prev = old_hf2.prev;
        old_hf2.prev = new_hf2;
        new_hf2.prev.next = new_hf2;

        // edges are now split
      }
      console.log("4. link everything up - creating face segments");

      let nextFaceIndextart = this.faces.length;
      let nextFaceIndex = nextFaceIndextart;
      for(let i_f = 0; i_f < nextFaceIndextart; i_f++){
        let originalFace = this.faces[i_f];

        // (x) <--h?- (m) <-h1-- (x)                      (x) <--h?- (m) <-h1-- (x)
        //  |                     ^                        |          ^|         ^
        //  h4                    h?                       h4      lhf||lhft     h?
        //  v                     |                        v          |V         |
        // (m)       (m_f)       (m)   connect2Center =>   (m)       (m_f)       (m)
        //  |                     ^       (h1,m_f)         |                     ^
        //  h?                    h2                       h?                    h2
        //  v                     |                        v                     |
        // (x) --h3-> (m) --h?-> (x)                      (x) --h3-> (m) --h?-> (x)
        //
        // create face at [h1,h2,h3,h4]

        // sanity check
        // let dbg_start_hf = originalFace.halfedge
        // let start = true;
        // let dbg_i = 0;
        // console.log("## face: %s", originalFace.idx);
        // for (let h = dbg_start_hf; start || h != dbg_start_hf; h = h.next) {
        //   dbg_i++;
        //   start = false;
        //   console.log(" %s| is midpoint: %s, hf_idx: %s", dbg_i, h.vertex.dbg_isEdgeMidpoint, h.idx);
        // }
        // console.log("## every second");


        let startHalfedge =
            originalFace.halfedge.vertex.idx < newVertexIndexStart ? originalFace.halfedge.next : originalFace.halfedge;
        let face_center = new_FacePoints.get(originalFace.idx);
        const connect_to_centerPoint = function(h1, scope){
          let ha = h1.prev;
          let l_e = new Edge();
          let l_hf = new Halfedge();
          let l_hft = new Halfedge();
          l_e.idx = nextEdgeIndex++;
          l_hf.idx = nextHfIndex++;
          l_hft.idx = nextHfIndex++;
          l_e.halfedge = l_hf;
          l_hf.twin = l_hft
          l_hft.twin = l_hf;
          l_hf.edge = l_e
          l_hft.edge = l_e;

          l_hf.vertex = face_center;
          l_hft.vertex = h1.vertex;

          l_hf.next = h1;
          h1.prev = l_hf;
          l_hft.prev = ha
          ha.next = l_hft;

          // set halfedge of face center (when the vertex is created not halfedge was set)
          face_center.halfedge = l_hf;

          // only face is still unset
          // and prev nex at the face_center side
          scope.edges.push(l_e);
          scope.halfedges.push(l_hf);
          scope.halfedges.push(l_hft);
        }
        connect_to_centerPoint(startHalfedge, this)


        let dbg_i2 = 0;
        let creatingFaceSegments = true;
        // for (let h2 = dbg_start_hf2; start2 || h2 != dbg_start_hf2; h2 = h2.next.next) {
        let nextHf = startHalfedge;
        let endAtHf = startHalfedge.prev.twin;
        while (creatingFaceSegments || dbg_i2 > 4) {
          let currenthf = nextHf;
          nextHf = nextHf.next.next;
          if(nextHf != endAtHf){
            // create edge and face
            connect_to_centerPoint(nextHf, this);
            let c_l = currenthf.prev;
            let c_r = currenthf.next.next

            c_r.next = c_l; // close face segment loop
            c_l.prev = c_r;
            // create face and linkup
            let face_segment = new Face();
            face_segment.idx = nextFaceIndex++;
            face_segment.isQuad = true; // catmull clark does always produce quads
            face_segment.halfedge = currenthf;

            currenthf.face = face_segment;
            currenthf.next.face = face_segment;
            currenthf.next.next.face = face_segment;
            currenthf.next.next.next.face = face_segment;

            let a = currenthf;
            let b = currenthf.next;
            let c = currenthf.next.next;
            let d = currenthf.next.next.next;

            // console.log("Face %d; curr: %s, b: %d, c: %d, d: %d", originalFace.idx, a.idx,b.idx,c.idx, d.idx)
            // console.log("Face midpoint vertex %s", face_center.idx)
            // console.log(" | verts %s %s %s %s", a.vertex.idx,b.vertex.idx,c.vertex.idx, d.vertex.idx)


            this.faces.push(face_segment);
          }else{
            // "shrink/retarget" original face to the last remaining segment
            let c_l = currenthf.prev;
            let c_r = currenthf.next.next

            c_r.next = c_l;
            c_l.prev = c_r;

            originalFace.halfedge = currenthf;

            currenthf.face = originalFace;
            currenthf.next.face = originalFace;
            currenthf.next.next.face = originalFace;
            currenthf.next.next.next.face = originalFace;

            creatingFaceSegments = false;
          }
          dbg_i2++;
        }
      }
    }
    console.log("##### Finished Subdivision ####")
    // this.plotHalfedges();

  }

  plotVertices(){
    for (let dbg_i = 0; dbg_i < this.vertices.length; dbg_i++){
      console.log("v: %i hf: %s - %s %s %s",
          this.vertices[dbg_i].idx,
          this.vertices[dbg_i].halfedge?.idx,
          this.vertices[dbg_i].position.x,
          this.vertices[dbg_i].position.y,
          this.vertices[dbg_i].position.z
      );
    }

  }
  plotHalfedges(){
    for (let dbg_i = 0; dbg_i < this.halfedges.length; dbg_i++){
      console.log("i: %i v: %i e: %i t: %i - f: %i p: %i n: %i",
          this.halfedges[dbg_i].idx,
          this.halfedges[dbg_i].vertex.idx,
          this.halfedges[dbg_i].edge.idx,
          this.halfedges[dbg_i].twin.idx,
          this.halfedges[dbg_i].face?.idx,
          this.halfedges[dbg_i].prev?.idx,
          this.halfedges[dbg_i].next?.idx);
    }
  }
  /**
   * Parses the HalfeEdgeMesh into an .obj compatible format
   * Currently only vertices and faces are exported (e.g. normals are not exported)
   *
   * Mainly used for debugging
   *
   * @returns {Blob} parsing result
   */
  parseToObj(){
    let lineSeperator =  "\n";
    let exp_header = "# Javascript Halfedge implemention Export";
    let exp_objName = "o cubeExport";
    let exp_vertices = "";
    let exp_faces = "";

    // parse into .obj format
    this.vertices.forEach(
        v => {
          let pos = v.position;
          exp_vertices += "v " + pos.x + " " + pos.y + " " + pos.z + lineSeperator
        }
    );

    this.faces.forEach(
        f => {
          // format: f v1 v2 v3 ....
          let line = "f ";
          f.vertices(
              (f_v, i) => {
                if(i != 0){
                  line += " "
                }
                line += f_v.idx+1; // +1 as in  obj format index starts at one instead of zero
              }
          )
          exp_faces += line + lineSeperator;
        }
    );

    let objectData =
        exp_header + lineSeperator +
        exp_objName + lineSeperator +
        exp_vertices + // no line sep as there is already one
        exp_faces;
    let type = "text/plain";
    let file = new Blob([objectData], {type: type});

    return file;
  }

  getStatistics(){
    let cnt_vertices = this.vertices.length;
    let cnt_edges = this.edges.length;
    let cnt_faces = this.faces.length;
    let subdivs = this.subdivisionCounter;

    return new HalfedgeMeshStatistics(cnt_vertices, cnt_edges, cnt_faces, subdivs);
  }
}

export class HalfedgeMeshStatistics {
  constructor(cnt_vertices = 0, cnt_edges = 0, cnt_faces = 0, subdivisions = 0) {
    this.cnt_vertices = cnt_vertices;
    this.cnt_edges = cnt_edges;
    this.cnt_faces = cnt_faces;
    this.subdivisions = subdivisions;
  }
}

