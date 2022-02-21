
import * as THREE from 'three';
import { Vertex, Edge, Face, Halfedge } from '../geometry/primitive';
import { Vector } from '../linalg/vec';
import { ThreeDArray } from '../helper/3DArray';
import { AlignedCube } from '../linalg/AlignedCube';
import { FogExp2 } from 'three';

// contains only static methods that are usefully for debugging and conversion between types
export class Helper{

    static addCubeSizeOne(scene:THREE.Scene){
        const halfSize=0.5;
        const min=new THREE.Vector3(-halfSize,-halfSize,-halfSize);
        const max=new THREE.Vector3(halfSize,halfSize,halfSize);
        const box = new THREE.Box3(min,max);
        const helper = new THREE.Box3Helper(box);
        scene.add(helper);
    }

     // create a mesh from the given vertices and indices
     static createMeshFromVertsIndices(vertices:number[],indices:number[],color1=new THREE.Color('green')):THREE.Mesh{
        const vertices2 = new Float32Array(vertices);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices2, 3 ) );
        geometry.setIndex( indices );
        const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
        const mesh = new THREE.Mesh( geometry, material );
        return mesh;
    }

    // create a wireframe mesh from the given vertices and indices
    static createWireframeMeshFromVertsIndices(vertices:number[],indices:number[],color1=new THREE.Color('green'),linewidth1=1): THREE.LineSegments{
        const vertices2 = new Float32Array(vertices);
        const geometry = new THREE.BufferGeometry();
        // itemSize = 3 because there are 3 values (components) per vertex
        geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices2, 3 ) );
        geometry.setIndex( indices );
        let segments = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({color:color1, linewidth: linewidth1})
        );
        return segments;
    }

    static testAddSimpleFace(scene:THREE.Scene){
        // create a simple square shape.
        const vertices = [
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
           -1.0,  1.0,  1.0,
        ] ;
        const indices=[
            0,1,2,0,2,3
        ];
        scene.add(Helper.createMeshFromVertsIndices(vertices,indices));
        scene.add(Helper.createWireframeMeshFromVertsIndices(vertices,indices));
    }

    static convertVertices(vertices:THREE.Vector3[]):number[]{
        let ret=new Array<number>(vertices.length);
        let count=0;
        for(let i=0;i<vertices.length;i++){
            const vert=vertices[i];
            ret[count++]=vert.x;
            ret[count++]=vert.y;
            ret[count++]=vert.z;
        }
        return ret;
    }

    static convertToThreeJs(vertices:Vector[]):THREE.Triangle{
        const v1=new THREE.Vector3(vertices[0].x,vertices[0].y,vertices[0].z);
        const v2=new THREE.Vector3(vertices[1].x,vertices[1].y,vertices[1].z);
        const v3=new THREE.Vector3(vertices[2].x,vertices[2].y,vertices[2].z);
        return new THREE.Triangle(v1,v2,v3);
    }

    static convertToThreJs2(vertices:number[]):THREE.Vector3[]{
        let ret=new Array<THREE.Vector3>(vertices.length/3);
        for(let i=0;i<ret.length;i++){
            const a=i*3+0;
            const b=i*3+1;
            const c=i*3+2;
            ret[i]=new THREE.Vector3(vertices[a],vertices[b],vertices[c]);
        }
        return ret;
    }

    public static debugBoundingBox(box:THREE.Box3){
        let v1=new THREE.Vector3();
        let v2=new THREE.Vector3();
        box.getSize(v1);
        box.getCenter(v2);
        console.log("Box:Center("+v2.x+","+v2.y+","+v2.z+")"+"Size("+v1.x+","+v1.y+","+v1.z+")");
    }
    static getRandomInt(max:number):number {
        return Math.floor(Math.random() * max);
    }

    static testIndices(scene:THREE.Scene){
        let xBuffVertices=new Array<number>();
        let xBuffIndices=new Array<number>();
        const xSize=10;
        const xSizePlus1=xSize+1;
        let ramba=ThreeDArray.create3DArray(xSizePlus1);
        let countLol=0;
        for(let x=0;x<xSizePlus1;x++){
            for(let y=0;y<xSizePlus1;y++){
                for(let z=0;z<xSizePlus1;z++){
                    const x1=x*0.1;
                    const y1=y*0.1;
                    const z1=z*0.1;
                    xBuffVertices.push(x1);
                    xBuffVertices.push(y1);
                    xBuffVertices.push(z1);
                    ramba[x][y][z]=countLol;
                    countLol++;
                }
            }
        }
        for(let x=0;x<xSize;x++){
            for(let y=0;y<xSize;y++){
                for(let z=0;z<xSize;z++){
                    //xBuffIndices=xBuffIndices.concat(AlignedCube.createFacesIndices(x,y,z,ramba));
                }
            }
        }
        xBuffIndices=xBuffIndices.concat(AlignedCube.createFacesIndices(xSize-1,xSize-1,xSize-1,ramba));
        scene.add(Helper.createWireframeMeshFromVertsIndices(xBuffVertices,xBuffIndices));
    }

    // Loop through the indices list. If a triangle made up of 3 Vertices is duplicated,
    // we can savely remove it. Returns a list of the indices remaining and a list of the 
    // removed indices
    static removeTwinTriangles(indices:number[]):[number[],number[]]{
        let map=new Map();
        let nRemoved=0;
        let removedIndices=new Array<number>();
        for(let i=0;i<indices.length;i+=3){
            const a1=indices[i+0];
            const b1=indices[i+1];
            const c1=indices[i+2];
            const e = `${a1}-${b1}-${c1}`;
            if(map.has(e)){
                if(map.get(e)!=null){
                    removedIndices.push(a1);
                    removedIndices.push(b1);
                    removedIndices.push(c1);
                }
                map.set(e, null);
                nRemoved++;
                //console.log("set to null");
            }else{
                map.set(e, [a1,b1,c1]);
                //console.log("add value");
            }
        }
        console.log("N removed indices:"+nRemoved);
        console.log("removed indices len:"+removedIndices.length);
        let remaining=new Array<number>();
        for(let key of Array.from(map.keys())) {
            const value=map.get(key);
            if(value!=null){
                remaining.push(value[0]);
                remaining.push(value[1]);
                remaining.push(value[2]);
                //console.log("add");
            }else{
                //console.log("remove");
            }
        }
        return [remaining,removedIndices];
    }

    static removeIsolatedVertices(vertices:THREE.Vector3[],indices:number[]):[THREE.Vector3[],number[]]{
        // mark the vertices that are actually used by indices
        let used=new Array<boolean>(vertices.length);
        used.fill(false);
        for(let i=0;i<indices.length;i++){
            used[indices[i]]=true;
        }
        let unused=new Array<number>();
        for(let i=0;i<used.length;i++){
            if(!used[i]){
                unused.push(i);
                console.log("Vert:"+i+" is unused\n");
            }else{
                //console.log("Vert:"+i+" is used\n");
            }
        }
        let verticesRet=new Array<THREE.Vector3>();
        for(let i=0;i<vertices.length;i++){
            if(used[i]){
                verticesRet.push(vertices[i]);
            }
        }
        //verticesRet=verticesRet.concat(vertices);


        let indicesRet=new Array<number>();
        indicesRet=indicesRet.concat(indices);

        for(let i=0;i<unused.length;i++){
            const unu=unused[i];
            for(let i=0;i<indicesRet.length;i++){
                if(indicesRet[i]>unu){
                    indicesRet[i]=indicesRet[i]-1;
                }
            }
        }

        return [verticesRet,indicesRet];
    }

}