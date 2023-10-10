import {AnnotationUITool, AnnotationUIToolbarBase} from './annotationUITool.mjs';
/**
 * The TransformTool class extends the AnnotationUITool and provides functionality for transforming selected items on the canvas.
 * @memberof OSDPaperjsAnnotation
 * @extends AnnotationUITool
 * @class
 * @memberof OSDPaperjsAnnotation
 */
class TransformTool extends AnnotationUITool{
        /**
     * Create a new TransformTool instance.
     * @memberof OSDPaperjsAnnotation.TransformTool
     * @constructor
     * @param {paper.PaperScope} paperScope - The Paper.js scope for the tool.
     *The constructor initializes the TransformTool by calling the base class (AnnotationUITool) constructor and sets up the necessary toolbar control (TransformToolbar).
     * @property {paper.PaperScope} ps - The Paper.js scope associated with the project.
     * @property {string} _mode - The current mode of the TransformTool.
     * @property {paper.Item[]} _moving - An array of items currently being moved or transformed.
     * @property {paper.Group} _transformTool - The TransformTool object that contains transformation controls.
     */
    constructor(paperScope){
        super(paperScope);
        let self=this;

        this.ps = this.project.paperScope;
        this._mode = 'transform';
        this._moving = [];
        this.setToolbarControl(new TransformToolbar(this));
        this.makeTransformToolObject(self.project.getZoom());
        
        this.extensions.onActivate=function(){ 
            // self.project.viewer.addHandler('canvas-click',self.clickHandler) 
            self.enableTransformToolObject();
        }    
        this.extensions.onDeactivate=function(shouldFinish){
            // self.project.viewer.removeHandler('canvas-click',self.clickHandler);
            self.tool.onMouseMove = null;
            self.project.overlay.removeClass(['transform-tool-resize', 'transform-tool-rotate']);
            if(shouldFinish){
                self.disableTransformToolObject();
            }
        }
    }
    // getSelectedItems(){
    //     return this.ps.project.selectedItems.filter(i=>i.isGeoJSONFeature);
    // }

    /**
     * A function that creates and initializes the TransformTool object with the specified zoom level.
     * This function sets up the corners for resizing, the rotation handle, and translation controls.
     * @param {number} currentZoom - The current zoom level of the canvas.
     * @property {paper.Group} _transformTool - The TransformTool object that contains transformation controls.
     * @property {object} _transformTool.corners - An object containing corner control points for resizing the bounding box.
     * @property {paper.Shape.Rectangle} _transformTool.corners.topLeft - The control point for the top-left corner.
     * @property {paper.Shape.Rectangle} _transformTool.corners.topRight - The control point for the top-right corner.
     * @property {paper.Shape.Rectangle} _transformTool.corners.bottomRight - The control point for the bottom-right corner.
     * @property {paper.Shape.Rectangle} _transformTool.corners.bottomLeft - The control point for the bottom-left corner.
     * @property {paper.Shape.Circle} _transformTool.rotationHandle - The control point for rotating the bounding box.
     * @property {function} _transformTool.setBounds - A function that (re)positions the tool handles (corners, rotation control).
     * @property {function} _transformTool.transformItems - A function that applies transformation to selected items and sets up new objects for transforming.
     * @property {function} _transformTool.onMouseDown - This function is triggered when the mouse button is pressed on the transform tool. It marks that the tool is in the dragging state.
     * @property {function} _transformTool.onMouseUp - This function is triggered when the mouse button is released on the transform tool. It marks that the tool is not in the dragging state.
     * @property {function} _transformTool.onMouseDrag - This function is triggered when the mouse is moved while a mouse button is pressed on the transform tool. It handles the dragging behavior of the transform tool. Depending on the state (resizing or translating), it resizes or translates the selected items accordingly.
     * @property {function} _transformTool.onMouseMove - This function is triggered when the mouse is moved on the transform tool. It updates the visual appearance of the transform tool, highlighting relevant handles and controls based on the mouse position.
     */
    makeTransformToolObject(currentZoom){
        let self=this;
        let cSize=12;//control size
             
        if(this._transformTool) this._transformTool.remove();
        this._transformTool = new paper.Group();
        
        this.project.toolLayer.addChild(this._transformTool);
        this._transformTool.applyMatrix=false;
        this._transformTool.transforming=[];
        this._transformTool.boundingRect = new paper.Shape.Rectangle(new paper.Point(0,0), new paper.Size(0,0));
        this._transformTool.boundingDisplay = new paper.Shape.Rectangle(new paper.Point(0,0), new paper.Size(0,0));
        this._transformTool.boundingRect.set({strokeWidth:0,fillColor:new paper.Color(0,0,0,0.001)});
        this._transformTool.boundingDisplay.set({strokeWidth:5,strokeColor:'lightblue',rescale:{strokeWidth:5}});
        this._transformTool.addChild(this._transformTool.boundingRect);
        this._transformTool.addChild(this._transformTool.boundingDisplay);
        
        //Resize operations
        this._transformTool.corners=[
         ['topLeft','bottomRight'],
         ['topRight','bottomLeft'],
         ['bottomRight','topLeft'],
         ['bottomLeft','topRight']].reduce((acc,c)=>{
             let ctrl = new paper.Shape.Rectangle(new paper.Point(0,0),new paper.Size(cSize/currentZoom,cSize/currentZoom));
            //  let refPt = new paper.Shape.Circle(new paper.Point(0,0),1);
            //  refPt.visible=false;
            //  ctrl.refPt = refPt;
             ctrl.set({rescale:{size:z=>new paper.Size(cSize/z, cSize/z)},fillColor:'red',strokeColor:'black'});
             self._transformTool.addChild(ctrl);
            //  self._transformTool.addChild(refPt);
             ctrl.anchor=c[0];
             ctrl.opposite=c[1];
             ctrl.onMouseDown = function(ev){ev.stopPropagation();}
             ctrl.onMouseDrag = function(ev){
                let rotation=this.parent.rotation;
                let delta=ev.delta.rotate(-rotation);
                
                let refPos = this.parent.corners[this.opposite].position;

                if(ev.modifiers.command || ev.modifiers.control){
                    delta = delta.project(this.position.subtract(refPos));
                }
                
                let oldPos = this.position;
                let newPos = this.position.add(delta);
                let oldSize=new paper.Rectangle(refPos,oldPos).size;
                let newSize=new paper.Rectangle(refPos,newPos).size;
                let sf = newSize.divide(oldSize);
                
                let refPosX = refPos.transform(this.parent.matrix);
                let refPosZ = this.parent.matrix.inverseTransform(this.parent.corners[this.opposite].refPos);

                this.parent.transforming.forEach( item=>{
                    let matrix = new paper.Matrix().scale(sf.width,sf.height,refPosZ); 
                    item.matrix.append(matrix);
                    item.onTransform && item.onTransform('scale', refPosX, rotation, matrix);
                });
                
                this.parent.boundingRect.scale(sf.width,sf.height,refPos);
                this.parent.setBounds(true);
             }
             acc[c[0]]=ctrl;
             return acc;
         },{});

        //Rotation operations
        this._transformTool.rotationHandle=new paper.Shape.Circle(new paper.Point(0,0),cSize/currentZoom);
        this._transformTool.rotationHandle.set({fillColor:'red',strokeColor:'black',rescale:{radius:cSize}});
        this._transformTool.addChild(this._transformTool.rotationHandle);
        this._transformTool.rotationHandle.onMouseDown = function(ev){ev.stopPropagation();}
        this._transformTool.rotationHandle.onMouseDrag = function(ev){
            let parentMatrix=this.parent.matrix;
            let center=parentMatrix.transform(this.parent.boundingRect.position);
            
            let oldVec = ev.point.subtract(ev.delta).subtract(center);
            let newVec = ev.point.subtract(center);
            let angle = newVec.angle - oldVec.angle;
            this.parent.rotate(angle,center);
            this.parent.transforming.forEach(item=>{
                item.rotate(angle,center);
                item.onTransform && item.onTransform('rotate', angle, center);
            })
            Object.values(this.parent.corners).forEach(corner=>{
                corner.refPos = corner.refPos.rotate(angle,center);
            })
        }

        //Translation operations
        this._transformTool.onMouseDown = function(ev){
            // console.log('mousedown',ev);
            // let hitresult=self.hitTest(ev.point) || this.boundingDisplay.hitTest(this.matrix.inverseTransform(ev.point));
            // hitresult = hitresult && (hitresult.item==this.boundingDisplay || (hitresult.item.isGeoJSONFeature&&hitresult.item.selected) );
            // console.log('hit',hitresult);
            if(this.boundingDisplay.contains(ev.point)){
                this._dragging = true;
            }
            // if(hitresult) this._dragging=true;
        }
        this._transformTool.onMouseUp = function(ev){
            this._dragging=false;
        }
        this._transformTool.onMouseDrag = function(ev){
            if(!this._dragging) return;
            this.translate(ev.delta);
            Object.values(this.corners).forEach(corner=>{
                corner.refPos = corner.refPos.add(ev.delta);
            })
            this.transforming.forEach(item=>{
                item.translate(ev.delta);
                item.onTransform && item.onTransform('translate', ev.delta);
            });
        }
        this.tool.onMouseMove=function(ev){
            
                let hitResult = self.project.paperScope.project.hitTest(ev.point);
                if(hitResult){
                    if(Object.values(self._transformTool.corners).indexOf(hitResult)){
                        self.project.overlay.addClass('transform-tool-resize');
                    } else {
                        self.project.overlay.removeClass('transform-tool-resize');
                    }
                        
                    if (self._transformTool.rotationHandle == hitResult){
                        self.project.overlay.addClass('transform-tool-rotate');
                    } else {
                        self.project.overlay.removeClass('transform-tool-rotate');
                    }
                    
                } else{
                    self.project.overlay.removeClass(['transform-tool-resize', 'transform-tool-rotate']);
                }

                if(self.item.contains(ev.point)){
                    self.project.overlay.addClass('transform-tool-move');
                } else {
                    self.project.overlay.removeClass('transform-tool-move');
                }
            
        }

        //(re)positioning the tool handles (corners, rotation control)
        this._transformTool.setBounds=function(useExistingBoundingRect=false){
            if(!useExistingBoundingRect){
                let bounds=this.transforming.reduce((acc,item)=>{
                    acc.minX = acc.minX===null?item.bounds.topLeft.x : Math.min(acc.minX,item.bounds.topLeft.x);
                    acc.minY = acc.minY===null?item.bounds.topLeft.y : Math.min(acc.minY,item.bounds.topLeft.y);
                    acc.maxX = acc.maxX===null?item.bounds.bottomRight.x : Math.max(acc.maxX,item.bounds.bottomRight.x);
                    acc.maxY = acc.maxY===null?item.bounds.bottomRight.y : Math.max(acc.maxY,item.bounds.bottomRight.y);
                    return acc;
                },{minX:null,minY:null,maxX:null,maxY:null});
                let rect = new paper.Rectangle(new paper.Point(bounds.minX,bounds.minY), new paper.Point(bounds.maxX,bounds.maxY));
                this.matrix.reset();
                this.boundingRect.set({position:rect.center,size:rect.size});
                // this.transforming.forEach(item=>item.rotationAxis=new paper.Point(rect.center));
            }
            
            let br=this.boundingRect;
            this.boundingDisplay.set({position:br.position,size:br.bounds.size});
            Object.values(this.corners).forEach(c=>{
                c.position=br.bounds[c.anchor];
                // if(!useExistingBoundingRect) c.refPt.position = c.position;
                if(!useExistingBoundingRect) c.refPos = c.position;
            })
            this.rotationHandle.set({
                position:br.position.subtract(new paper.Point(0,br.bounds.size.height/2+this.rotationHandle.radius*2))
            });
        }



        this._transformTool.transformItems=function(items){
            //finish applying all transforms to previous items (called during disableTransformToolObject)
            this.transforming.forEach(item=>{
                item.matrix.apply(true,true);
                item.onTransform && item.onTransform('complete');
            })

            //set up new objects for transforming, and reset matrices of the tool
            this.transforming=items;
            items.forEach(item=>item.applyMatrix=false)
            this.matrix.reset();
            this.boundingRect.matrix.reset();
            this.boundingDisplay.matrix.reset();
            this.setBounds();
        }
        this._transformTool.visible=false;
    }
    /**
     * A function that enables the TransformTool object for transforming selected items.
     * This function activates the TransformTool, bringing it to the front, and sets up items for transformation.
     */
    enableTransformToolObject(){
        this.project.toolLayer.bringToFront();
        this._transformTool.visible=true;
        this._transformTool.transformItems(this.items);
        // this._transformTool.transformItems(this.getSelectedItems());
        
    }
    /**
     * A function that disables the TransformTool object after transforming selected items.
     * This function deactivates the TransformTool, sends it to the back, and resets item matrices.
     */
    disableTransformToolObject(){
        this.project.toolLayer.sendToBack();
        this._transformTool.transformItems([]);
        this._transformTool.visible=false;
    }
    /**
     * A function that performs a hit test on the canvas to find the item under the specified coordinates.
     * This function is used to determine the item selected for transformation.
     * @param {paper.Point} coords - The coordinates to perform the hit test.
     * @returns {paper.HitResult} - The result of the hit test, containing the selected item.
     */
    hitTest(coords){
        let hitResult = this.ps.project.hitTest(coords,{
            fill:true,
            stroke:true,
            segments:true,
            tolerance:(5/this.project.getZoom()),
            match:i=>i.item.isGeoJSONFeature || i.item.parent.isGeoJSONFeature,
        })
        if(hitResult && !hitResult.item.isGeoJSONFeature){
            hitResult.item = hitResult.item.parent;
        }
        return hitResult;
    }
}
export{TransformTool};
/**
 * The TransformToolbar class extends the AnnotationUIToolbarBase and provides functionality for the transform tool's toolbar.
 * @memberof OSDPaperjsAnnotation.TransformTool
 * @extends AnnotationUIToolbarBase
 */
class TransformToolbar extends AnnotationUIToolbarBase{
    /**
     * Create a new TransformToolbar instance.
     * @memberof OSDPaperjsAnnotation.TransformToolbar
     * @constructor
     * @param {TransformTool} tool - The TransformTool instance associated with the toolbar.
     */
    constructor(tool){
        super(tool);
        $(this.dropdown).addClass('transform-dropdown');
        let html = $('<i>',{class:'fa-solid fa-up-down-left-right'})[0];
        this.button.configure(html,'Transform Tool');
        
    }
    /**
     * Checks if the transform tool is enabled for the specified mode.
     * The transform tool is enabled when there are selected items on the canvas.
     * @method
     * @param {string} mode - The current mode.
     * @returns {boolean} - True if the transform tool is enabled for the mode, otherwise false.
     */
    isEnabledForMode(mode){
        return this.tool.project.paperScope.findSelectedItems().length>0 && [
            'select',
            'multiselection',
            'MultiPolygon',
            'Point:Rectangle',
            'Point:Ellipse',
            'Point',
            'LineString',
            'GeometryCollection:Raster',
        ].includes(mode);
    }
    
}