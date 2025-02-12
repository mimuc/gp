// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

// API Usage about @penrose/linear-algebra:
//
//   - There are two types of matrices: SparseMatrix and DenseMatrix
//   - SparseMatrix.identity(n, n) gives you a identity matrix with
//     n x n dimension
//   - Triplet represents a small structure to hold non-zero entries in
//     SparseMatrix, each entry is (x, i, j). To construct a SparseMatrix,
//     here is an example:
//
//       let A = new Triplet(2, 2)          // Triplet for 2x2 SparseMatrix
//       A.addEntry(1, 0, 0)                // A(0, 0) += 1
//       A.addEntry(2, 1, 1)                // A(1, 1) += 2
//       return SparseMatrix.fromTriplet(T) // Construct SparseMatrix
//
//   - A.timesSparse(B) returns A*B where A and B are SparseMatrix.
//   - A.plus(B) returns A+B where A and B are SparseMatrix.
//   - A.timesReal(s) returns sA where A is SparseMatrix and s is a real number.
//   - A.chol() returns a sparse Cholesky decomposition.
//   - A.solvePositiveDefinite(b) solves linear equation Ax=b where
//     A is a Cholesky decomposition, and b is a DenseMatrix, and x is the solution.
//   - For a DenseMatrix A, one can use A.set(x, i, j) for A(i,j)=x,
//     and A.get(i, j) returns A(i,j).
//
// Further APIs regarding @penrose/linear-algebra can be found
// in node_modules/@penrose/linear-algebra/docs/*.html, but the above
// information are all the APIs you need for this project.
import {DenseMatrix, SparseMatrix, Triplet} from '@penrose/linear-algebra';
import {Vector} from '../linalg/vec';
import {HalfedgeMesh} from './halfedge_mesh';

export enum WeightType {
  Uniform = 'Uniform',
  Cotan = 'Cotan',
}

export enum BoundaryType {
  Disk = 'disk',
  Rectangle = 'rect',
}

export class ParameterizedMesh extends HalfedgeMesh {
  /**
   * constructor constructs the halfedge-based mesh representation.
   *
   * @param {string} data is a text string from an .obj file
   */
  constructor(data: string) {
    super(data);
  }
  /**
   * flatten computes the UV coordinates of the given triangle mesh.
   *
   * This implementation reuiqres the mesh contains at least one
   * boundary loop.
   *
   * @param {BoundaryType} boundaryType 'disk', or 'rect'
   * @param {WeightType} laplaceWeight 'uniform', or 'cotan'
   */
  flatten(boundaryType: BoundaryType, laplaceWeight: WeightType) {
    // TODO: Implement Tutte's barycentric embedding
    //
    // Implementation procedure:
    //
    //    1. check if the mesh contains at least a boundary. Otherwise, throw an error.
    //    2. compute boundary uv coordinates depending on the boundary type.
    //    3. compute matrix depending on the laplacian weight type.
    //    4. solve linear equation and assing computed uv to corresponding vertex uv.
    //

    // 1. check if the mesh contains a boundary. Otherwise, throw an error.
    if (this.boundaries.length === 0) {
      const msg = 'failed: imported mesh has no boundary';
      alert(msg);
      return;
    }

    // 2. compute boundary uv coordinates depending on the boundary type
    const [U, V] = this.computeBoundaryMatrices(boundaryType);

    // 3. compute matrix depending on the laplacian weight type
    const M = this.computeInteriorMatrix(U, V, laplaceWeight);

    // 4. solve linear equation and assing computed uv as vertex uv
    const lu = M.lu();
    const uu = lu.solveSquare(U);
    const vv = lu.solveSquare(V);
    for (const v of this.verts) {
      v.uv = new Vector(uu.get(v.idx) + 0.5, 0.5 + vv.get(v.idx), 0);
    }
  }

  /**
   * computeBoundaryMatrices computes and returns the two matrices for
   * boundary vertices.
   *
   * @param {BoundaryType} boundaryType 'disk', or 'rect'
   */
  computeBoundaryMatrices(
    boundaryType: BoundaryType
  ): [typeof DenseMatrix, typeof DenseMatrix] {
    const U = DenseMatrix.zeros(this.verts.length);
    const V = DenseMatrix.zeros(this.verts.length);

    // TODO: compute the right hand side of the linear parameterization system
    // for boundary vertices depending on the type of the boundary.
    //
    // Note that the coordinates of boundary vertices is derived from the
    // property of "convex in order".

    const r = 0.5; // disk radius
    const l = 1; // rect edge length
    let N = 0; // number of boundary edges
    const f = this.boundaries[0]; // use the first boundary face
    let totalL = 0;
    let boundaryIdx = 0;
    let k = 0;
    f.halfedges(() => N++);
    switch (boundaryType) {
      case BoundaryType.Disk:
        f.halfedges((h, i) => {
          U.set(r * Math.cos((2 * Math.PI * i) / N), h!.vert!.idx);
          V.set(r * Math.sin((2 * Math.PI * i) / N), h!.vert!.idx);
        });
        break;
      case BoundaryType.Rectangle:
        f.halfedges(h => {
          let x = 0;
          let y = 0;
          const elen = (4 * l * k) / N;
          const sign = Math.pow(-1, Math.floor(boundaryIdx / 2));
          if (totalL < l) {
            if (boundaryIdx % 2 === 0) {
              x = sign * (l / 2 - elen);
              y = sign * (l / 2);
            } else {
              x = sign * (-l / 2);
              y = sign * (l / 2 - elen);
            }
            totalL += (4 * l) / N;
            k++;
          } else {
            if (boundaryIdx % 2 === 0) {
              x = (sign * -l) / 2;
              y = (sign * l) / 2;
            } else {
              x = (sign * -l) / 2;
              y = (sign * -l) / 2;
            }
            totalL -= l;
            k = 0;
            boundaryIdx++;
          }
          U.set(x, h!.vert!.idx);
          V.set(y, h!.vert!.idx);
        });
        break;
      default:
        // undefined
        throw new Error('unsupported boundary type');
    }

    return [U, V];
  }

  /**
   * computeInteriorMatrices returns the sparse matrix for interior vertices.
   *
   * @param U the U dimension of boundary vertices
   * @param V the V dimension of boundary vertices
   * @param laplaceWeight the weight type of laplacian
   */
  computeInteriorMatrix(
    U: typeof DenseMatrix,
    V: typeof DenseMatrix,
    laplaceWeight: WeightType
  ): typeof SparseMatrix {
    const T = new Triplet(this.verts.length, this.verts.length);

    // TODO: compute the left hand side of the linear parameterization system
    // for interior vertices that we want to compute their parameterization.
    //
    // Note that the interior matrix is essentially the Laplace matrix, but
    // the elements that corresponding to the boundary vertices are zerored out.
    switch (laplaceWeight) {
      case WeightType.Uniform:
        for (const v of this.verts) {
          const i = v.idx;
          if (U.get(i) !== 0 || V.get(i) !== 0) {
            T.addEntry(1, i, i);
          } else {
            let n = 0;
            v.vertices(neighbor => {
              const j = neighbor.idx;
              T.addEntry(1, i, j);
              n += 1;
            });
            T.addEntry(-n, i, i);
          }
        }
        break;
      case WeightType.Cotan:
        for (const v of this.verts) {
          const i = v.idx;
          if (U.get(i) !== 0 || V.get(i) !== 0) {
            T.addEntry(1, i, i);
          } else {
            const area = v.voronoiCell();
            let sum = 0;
            v.halfedges(h => {
              const j = h.next!.vert!.idx;
              const w = (h.cotan() + h.twin!.cotan()) / (2 * area);
              T.addEntry(w, i, j);
              sum += w;
            });
            T.addEntry(-sum, i, i);
          }
        }
        break;
      default:
        throw new Error('unsupported laplace weight type');
    }
    return SparseMatrix.fromTriplet(T);
  }
}
